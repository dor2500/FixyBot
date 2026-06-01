import json
import os
import uuid
import datetime
import logging

logger = logging.getLogger(__name__)

class CorrectionsManager:
    def __init__(self, file_path="corrections.json"):
        # Put the file in the same directory as the script
        current_dir = os.path.dirname(os.path.abspath(__file__))
        self.file_path = os.path.join(current_dir, file_path)
        self.corrections = []
        self.load_corrections()

    def load_corrections(self):
        if os.path.exists(self.file_path):
            try:
                with open(self.file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.corrections = data.get("corrections", [])
                logger.info(f"Loaded {len(self.corrections)} corrections from {self.file_path}")
            except Exception as e:
                logger.error(f"Error loading corrections: {e}")
                self.corrections = []
        else:
            self.corrections = []

    def save_corrections(self):
        try:
            with open(self.file_path, 'w', encoding='utf-8') as f:
                json.dump({"corrections": self.corrections}, f, ensure_ascii=False, indent=2)
            logger.info("Saved corrections successfully.")
        except Exception as e:
            logger.error(f"Error saving corrections: {e}")

    def add_correction(self, question: str, wrong_answer: str, correct_answer: str, admin_id: int):
        new_correction = {
            "id": str(uuid.uuid4())[:8],
            "timestamp": datetime.datetime.now().isoformat(),
            "admin_id": admin_id,
            "question": question,
            "wrong_answer": wrong_answer,
            "correct_answer": correct_answer
        }
        self.corrections.append(new_correction)
        self.save_corrections()
        return new_correction

    def delete_correction(self, correction_id: str):
        original_count = len(self.corrections)
        self.corrections = [c for c in self.corrections if c["id"] != correction_id]
        if len(self.corrections) < original_count:
            self.save_corrections()
            return True
        return False

    def get_all_corrections(self):
        return self.corrections

    def get_context_text(self) -> str:
        """Returns all corrections formatted for the system prompt."""
        if not self.corrections:
            return ""
        
        lines = ["--- תיקונים שנלמדו מהמערכת (חשוב מאוד!) ---"]
        for c in self.corrections:
            lines.append(f"שאלה: {c['question']}")
            lines.append(f"תשובה נכונה מעודכנת שחובה להשתמש בה: {c['correct_answer']}")
            lines.append("-" * 20)
        lines.append("------------------------------------------")
        return "\n".join(lines)
