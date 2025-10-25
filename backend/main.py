import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from secret_loader import get_secret
import requests
import json
import openai


app = Flask(__name__)
CORS(app)

# OpenAI key read via Secret Manager or env
OPENAI_API_KEY = None
try:
    OPENAI_API_KEY = get_secret("OPENAI_API_KEY", default=os.getenv("OPENAI_API_KEY"))
except Exception as e:
    print(f"Warning: Error getting OpenAI key: {e}")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


def fetch_api(url: str, error_message: str):
    try:
        resp = requests.get(url, timeout=15)
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        raise RuntimeError(f"{error_message}: {str(e)}")


@app.get("/health")
def health():
    return jsonify(status="ok")


@app.get("/")
def root():
    return jsonify(message="PharmKo backend is alive")


@app.post("/analyze")
def analyze():
    data = request.get_json(silent=True) or {}
    drug_name = data.get("drugName")
    if not drug_name:
        return jsonify({"error": "missing drugName"}), 400

    logs = []
    try:
        logs.append(f"Identifying drug: {drug_name}...")
        # RxNorm
        rx_url = f"https://rxnav.nlm.nih.gov/REST/rxcui.json?name={requests.utils.quote(drug_name)}&search=2"
        rx_data = fetch_api(rx_url, 'RxNorm API request failed')
        rxcui = None
        if rx_data:
            rxcui = rx_data.get('idGroup', {}).get('rxnormId', [None])[0]
        if not rxcui:
            return jsonify({"error": f"Could not find a valid RxCUI for '{drug_name}'."}), 404

        ingredient_url = f"https://rxnav.nlm.nih.gov/REST/rxcui/{rxcui}/related.json?tty=IN"
        ingredient_data = fetch_api(ingredient_url, 'RxNorm ingredient lookup failed')
        active_ingredient = (
            ingredient_data.get('relatedGroup', {}).get('conceptGroup', [])[0]
            .get('conceptProperties', [])[0]
            .get('name')
            if ingredient_data and ingredient_data.get('relatedGroup') else drug_name
        )

        source_data = {"rxcui": rxcui, "activeIngredient": active_ingredient}
        logs.append(f"Fetching data for {active_ingredient} (RxCUI: {rxcui})...")

        # FDA
        fda_api_key = os.environ.get('FDA_API_KEY')
        label_url = f"https://api.fda.gov/drug/label.json?search=openfda.substance_name:\"{requests.utils.quote(active_ingredient)}\"&limit=1"
        events_url = f"https://api.fda.gov/drug/event.json?search=patient.drug.openfda.substance_name:\"{requests.utils.quote(active_ingredient)}\"&count=patient.reaction.reactionmeddrapt.exact&limit=50"
        if fda_api_key:
            label_url += f"&api_key={fda_api_key}"
            events_url += f"&api_key={fda_api_key}"

        fda_label = fetch_api(label_url, 'FDA Label API returned an error')
        adverse_events = fetch_api(events_url, 'FDA Adverse Events API returned an error')
        logs.append('✓ FDA data retrieved.')

        # ClinicalTrials
        clinical_url = f"https://clinicaltrials.gov/api/v2/studies?query.term={requests.utils.quote(active_ingredient)}&pageSize=50"
        clinical_trials = fetch_api(clinical_url, 'ClinicalTrials.gov API request failed')
        logs.append('✓ ClinicalTrials.gov data retrieved.')

        # PubMed
        pubmed_email = os.environ.get('PUBMED_EMAIL', 'info@example.com')
        pubmed_url = (
            f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=({requests.utils.quote(active_ingredient)})+AND+(safety+OR+adverse+OR+risk)"
            f"&retmax=200&sort=relevance&retmode=json&email={requests.utils.quote(pubmed_email)}"
        )
        pubmed_data = fetch_api(pubmed_url, 'PubMed API request failed')
        logs.append('✓ PubMed articles retrieved.')

        # Europe PMC
        europe_url = (
            f"https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=({requests.utils.quote(active_ingredient)})%20AND%20(SAFETY%20OR%20ADVERSE%20OR%20RISK)"
            f"&resultType=lite&pageSize=200&format=json"
        )
        europe_data = fetch_api(europe_url, 'Europe PMC API request failed')
        logs.append('✓ Europe PMC articles retrieved.')

        source_data.update({
            "fdaLabel": fda_label,
            "adverseEvents": adverse_events,
            "clinicalTrials": clinical_trials,
            "pubmedArticles": pubmed_data,
            "europePmcArticles": europe_data,
        })

        logs.append('Synthesizing data with OpenAI...')

        # Build prompt (trim raw data to avoid oversize prompts)
        raw_fda = json.dumps(fda_label.get('results', [None])[0])[:4000] if fda_label else ''
        raw_adverse = f"Total Reports: {adverse_events.get('meta', {}).get('results', {}).get('total') if adverse_events else '0'}. Top results: {json.dumps(adverse_events.get('results', [])[:10])[:4000]}"
        raw_clinical = json.dumps(clinical_trials.get('studies', [])[:10])[:4000] if clinical_trials else ''
        pubmed_count = int(pubmed_data.get('esearchresult', {}).get('count', 0)) if pubmed_data else 0
        europe_count = int(europe_data.get('hitCount', 0)) if europe_data else 0

        prompt = f"""
Analyze the provided pharmaceutical data for "{active_ingredient}". Generate a comprehensive, consumer-friendly report in JSON format.
The report MUST strictly adhere to the JSON schema described below.

- Drug Label Analysis: summary, blackBoxWarning (string or 'none'), activeIngredient, otherDrugsWithActiveIngredient (array of strings)
- Clinical Trial Analysis: summary, highestPhase, conditionsStudied
- Adverse Effects Profile: summary, totalEvents (number), pieChartData (array of {{name, value}} where value is percentage), top5Events
- Journal Analysis: summary, keyFindings (array), articlesReviewed (number), paywalledArticles (number)
- Drug Interactions: summary, interactions (array of {{substance, effect, severity}})
- Potential Harm Score: summary, score (1-10 number)
- Citations: array of {{source, details}}

All text fields should be Markdown-formatted where appropriate. Return the entire response as pure JSON (no surrounding markdown fences).

RAW DATA SNIPPETS (truncated):
- FDA Label: {raw_fda}
- Adverse Events (FAERS): {raw_adverse}
- Clinical Trials (examples): {raw_clinical}
- PubMed/EuropePMC Article Count: {pubmed_count + europe_count}
"""

        # Call OpenAI
        openai.api_key = OPENAI_API_KEY
        model = os.environ.get('OPENAI_MODEL', 'gpt-4')
        if not openai.api_key:
            return jsonify({"error": "OpenAI API key not configured on the server."}), 500

        messages = [
            {"role": "system", "content": "You are an expert pharmacovigilance assistant. Produce strictly structured JSON following the schema described."},
            {"role": "user", "content": prompt},
        ]

        # Use ChatCompletion
        resp = openai.ChatCompletion.create(
            model=model,
            messages=messages,
            temperature=0.1,
            max_tokens=3000,
        )

        text = resp['choices'][0]['message']['content']

        # Attempt to parse JSON from model output
        try:
            analysis_result = json.loads(text)
        except Exception:
            # If model returned markdown or text, attempt to extract JSON substring
            start = text.find('{')
            end = text.rfind('}')
            if start != -1 and end != -1 and end > start:
                try:
                    analysis_result = json.loads(text[start:end+1])
                except Exception as e:
                    return jsonify({"error": "Failed to parse JSON from OpenAI response", "raw": text}), 502
            else:
                return jsonify({"error": "OpenAI response did not contain JSON", "raw": text}), 502

        logs.append('✓ AI analysis complete.')

        return jsonify({"analysisResult": analysis_result, "sourceData": source_data, "logs": logs})

    except Exception as e:
        return jsonify({"error": str(e), "logs": logs}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get('PORT', 8080)))

