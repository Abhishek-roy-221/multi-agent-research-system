from agents import build_search_agent, build_reader_agent, writer_chain, critic_chain


def run_research_pipeline(topic: str, status_callback=None):

    state = {}

    def update_status(stage, status):
        if status_callback:
            status_callback(stage, status)

    print("\n" + " =" * 50)
    print("Step 1- Search agent is working...")
    print("=" * 50)

    update_status("search", "running")

    search_agent = build_search_agent()
    search_result = search_agent.invoke({
        "messages": [
            ("user", f"Find recent, reliable and detailed information about: {topic}")
        ]
    })

    state["search_results"] = search_result["messages"][-1].content

    update_status("search", "completed")

    print("\nsearch result", state["search_results"])


    print("\n" + " =" * 50)
    print("Step 2- Reader agent is scrapping top resources...")
    print("=" * 50)

    update_status("reader", "running")

    reader_agent = build_reader_agent()
    reader_result = reader_agent.invoke({
        "messages": [
            (
                "user",
                f"Based on the following search results about '{topic}',"
                f"pick the most relevant URL and scrape it for deeper content.\n\n"
                f"Search Results:\n{state['search_results'][:800]}"
            )
        ]
    })

    state["scraped_content"] = reader_result["messages"][-1].content

    update_status("reader", "completed")

    print("\nscrapped content:\n", state["scraped_content"])


    print("\n" + " =" * 50)
    print("Step 3- Writer is drafting the report...")
    print("=" * 50)

    update_status("writer", "running")

    research_combined = (
        f"SEARCH RESULTS:\n{state['search_results']}\n\n"
        f"DETAILED SCRAPED CONTENT:\n{state['scraped_content']}"
    )

    state["report"] = writer_chain.invoke({
        "topic": topic,
        "research": research_combined
    })

    update_status("writer", "completed")

    print("\nFinal Report\n", state["report"])


    print("\n" + " =" * 50)
    print("Step 4 - critic is reviewing the report...")
    print("=" * 50)

    update_status("critic", "running")

    state["feedback"] = critic_chain.invoke({
        "report": state["report"]
    })

    update_status("critic", "completed")

    print("\ncritic report\n", state["feedback"])

    return state


if __name__ == "__main__":
    topic = input("\nEnter a research topic: ")
    run_research_pipeline(topic)