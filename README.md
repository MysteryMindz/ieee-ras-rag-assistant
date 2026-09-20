# RAS Guide — IEEE RAS RAG Assistant

RAS Guide is a public-source retrieval-augmented generation (RAG) assistant for the IEEE Robotics and Automation Society and IEEE RAS at VIT Chennai. It retrieves relevant passages from a curated knowledge base, sends only those passages to an open-source FLAN-T5 model, and displays the answer with clickable source citations.

## Live application

The production link is added here after deployment.

## What makes this RAG

1. The question is normalized and expanded with domain terms.
2. A BM25-style lexical retriever ranks every passage using term frequency, inverse document frequency, title matches, and topic tags.
3. Only the top four passages enter the answer prompt.
4. FLAN-T5 generates a concise answer constrained to that context.
5. The interface shows the retrieved evidence and direct source links. Unsupported questions receive an explicit refusal.

The hosted web app runs `Xenova/flan-t5-small` locally in the visitor's browser, so it needs no private API key. Its first generated answer downloads the open model; retrieval works immediately and an extractive grounded fallback is used if the model cannot load. The repository also includes the preferred Python + Streamlit implementation in `app.py`.

## Run the Streamlit version

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
streamlit run app.py
```

## Run and test the static hosted version

```bash
npm test
npx serve dist
```

## Knowledge sources

The knowledge base uses official IEEE RAS pages for its mission, membership, student activities, publications, conferences, standards, and code of conduct. VIT Chennai content comes from public chapter pages, VIT documents, and the public RAScade page. Older VIT Chennai material is marked historical so it is not presented as current leadership or recruitment information.

This is an independent student project and is not an official IEEE product.
