import streamlit as st
from pipeline import run_research_pipeline

st.set_page_config(
    page_title="Multi-Agent Research System",
    
    layout="wide",
)

st.title("🔎 Multi-Agent Research System")
st.caption("Search agent → Reader agent → Writer → Critic")

if "result" not in st.session_state:
    st.session_state.result = None

with st.form("research_form"):
    topic = st.text_input(
        "Research topic",
        placeholder="e.g. Impact of quantum computing on cryptography",
    )
    submitted = st.form_submit_button("Run pipeline", use_container_width=True)

if submitted:
    if not topic.strip():
        st.warning("Please enter a topic before running the pipeline.")
    else:
        with st.status("Running multi-agent pipeline...", expanded=True) as status:
            st.write("**Step 1** — Search agent is gathering sources...")
            st.write("**Step 2** — Reader agent is scraping the top result...")
            st.write("**Step 3** — Writer agent is drafting the report...")
            st.write("**Step 4** — Critic agent is reviewing the report...")
            try:
                result = run_research_pipeline(topic)
                st.session_state.result = result
                status.update(label="Pipeline finished", state="complete", expanded=False)
            except Exception as e:
                status.update(label="Pipeline failed", state="error", expanded=True)
                st.error(f"Something went wrong: {e}")
                st.session_state.result = None

result = st.session_state.result

if result:
    st.divider()

    tab_report, tab_feedback, tab_search, tab_scraped = st.tabs(
        [" Report", " Critic Feedback", " Search Results", " Scraped Content"]
    )

    with tab_report:
        st.markdown(result.get("report", "_No report generated._"))
        st.download_button(
            "Download report (.md)",
            data=str(result.get("report", "")),
            file_name="research_report.md",
            mime="text/markdown",
        )

    with tab_feedback:
        st.markdown(result.get("feedback", "_No feedback generated._"))

    with tab_search:
        st.text_area(
            "Raw search results",
            value=str(result.get("search_results", "")),
            height=400,
        )

    with tab_scraped:
        st.text_area(
            "Raw scraped content",
            value=str(result.get("scraped_content", "")),
            height=400,
        )
else:
    st.info("Enter a topic above and click **Run pipeline** to get started.")