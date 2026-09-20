from pathlib import Path
import streamlit as st
from rag import load_kb, retrieve, build_prompt, extractive_answer

st.set_page_config(page_title="RAS Guide", page_icon="🤖", layout="wide")

@st.cache_data
def knowledge(): return load_kb(Path(__file__).parent / "dist/data/kb.json")

@st.cache_resource(show_spinner="Loading the open-source answer model…")
def generator():
    from transformers import pipeline
    return pipeline("text2text-generation", model="google/flan-t5-small")

def generate(question, hits):
    try:
        result = generator()(build_prompt(question, hits), max_new_tokens=150, do_sample=False)
        return result[0]["generated_text"].strip()
    except Exception:
        return extractive_answer(question, hits)

st.markdown("""
<style>
  .stApp{background:#f4f2e9;color:#061d2b}.block-container{max-width:1200px;padding-top:2rem}
  h1{font-family:Georgia,serif;font-size:4rem!important;letter-spacing:-.05em}.stChatMessage{background:#fff;border:1px solid #d6dfdc;border-radius:12px;padding:1rem}
  [data-testid=stSidebar]{background:#eaf2ef}.source{border:1px solid #c9d8d4;border-radius:9px;padding:12px;margin:8px 0;background:white}
</style>""", unsafe_allow_html=True)

st.caption("IEEE ROBOTICS & AUTOMATION SOCIETY")
st.title("Ask. Retrieve. Verify.")
st.write("Answers grounded in public IEEE RAS and VIT Chennai chapter sources, with the retrieved evidence shown beside every response.")

if "messages" not in st.session_state: st.session_state.messages = []
with st.sidebar:
    st.subheader("Knowledge base")
    st.write(f"{len(knowledge())} curated source passages")
    st.caption("VIT Chennai pages with older dates are explicitly marked historical.")
    if st.button("Clear conversation", use_container_width=True): st.session_state.messages = []; st.rerun()

for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])
        if message.get("sources"):
            with st.expander("Retrieved sources", expanded=True):
                for i, source in enumerate(message["sources"], 1):
                    st.markdown(f"**[{i}] [{source['title']}]({source['url']})** · {source['relevance']}% match\n\n{source['text']}")

if prompt := st.chat_input("Ask about IEEE RAS…"):
    st.session_state.messages.append({"role":"user","content":prompt})
    with st.chat_message("user"): st.markdown(prompt)
    ranked = retrieve(prompt, knowledge(), 4)
    hits = [hit for i, hit in enumerate(ranked) if i == 0 or hit["relevance"] >= 20][:3]
    with st.chat_message("assistant"):
        with st.spinner("Retrieving evidence and generating an answer…"):
            answer = generate(prompt, hits) if hits and hits[0]["relevance"] >= 22 else extractive_answer(prompt, [])
        citations = " ".join(f"[[{i}]]({h['url']})" for i, h in enumerate(hits, 1))
        st.markdown(answer + ("\n\n" + citations if citations else ""))
        with st.expander("Retrieved sources", expanded=True):
            for i, source in enumerate(hits, 1):
                st.markdown(f"**[{i}] [{source['title']}]({source['url']})** · {source['relevance']}% match\n\n{source['text']}")
    st.session_state.messages.append({"role":"assistant","content":answer + ("\n\n" + citations if citations else ""),"sources":hits})
