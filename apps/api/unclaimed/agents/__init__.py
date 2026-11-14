"""Agents: the Claim Agent (LangGraph) and the Navigator (tool loop).

The LLM reads, plans and drafts only through tools. It never decides eligibility (the
rules engine does), never reads unapproved data, and has no tool that sends anything.
"""
