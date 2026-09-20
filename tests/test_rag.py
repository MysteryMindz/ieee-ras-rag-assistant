import unittest
from pathlib import Path
from rag import load_kb, retrieve, build_prompt, extractive_answer

ROOT = Path(__file__).parents[1]

class RagTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls): cls.kb = load_kb(ROOT / "dist/data/kb.json")
    def test_mission_retrieval(self):
        hits = retrieve("What is the mission of IEEE RAS?", self.kb)
        self.assertEqual(hits[0]["id"], "ras-mission")
    def test_vit_retrieval(self):
        hits = retrieve("Tell me about IEEE RAS VIT Chennai", self.kb)
        self.assertIn(hits[0]["id"], {"vit-branch", "rascade", "vit-inauguration"})
    def test_prompt_contains_only_hits(self):
        hits = retrieve("RAS publications", self.kb, 2); prompt = build_prompt("RAS publications", hits)
        self.assertIn(hits[0]["text"], prompt); self.assertIn("Do not invent", prompt)
    def test_unsupported_query_refuses(self):
        self.assertIn("could not find support", extractive_answer("cafeteria menu", []))

if __name__ == "__main__": unittest.main()
