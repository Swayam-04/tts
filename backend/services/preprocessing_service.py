import json
import os


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RESOURCE_DIR = os.path.join(BASE_DIR, "resources")


def load_system_prompt():
    """
    Load the system prompt from resources/system_prompt.txt
    """
    prompt_path = os.path.join(RESOURCE_DIR, "system_prompt.txt")

    with open(prompt_path, "r", encoding="utf-8") as f:
        return f.read()


def load_abbreviations():
    """
    Load abbreviations from resources/abbreviations.json
    """
    abbreviation_path = os.path.join(
        RESOURCE_DIR,
        "abbreviations.json"
    )

    with open(abbreviation_path, "r", encoding="utf-8") as f:
        return json.load(f)


def expand_abbreviations(coded_text):
    """
    Replace abbreviated field names with full field names.
    """

    abbreviations = load_abbreviations()

    expanded_lines = []

    for line in coded_text.split("\n"):

        if ":" in line:

            key, value = line.split(":", 1)

            key = key.strip().upper()

            value = value.strip()

            expanded_key = abbreviations.get(
                key,
                {"field": key}
            )["field"]

            expanded_lines.append(
                f"{expanded_key}: {value}"
            )

        else:

            expanded_lines.append(line)

    return "\n".join(expanded_lines)


def build_prompt(coded_text):
    """
    Complete preprocessing pipeline.

    coded text
        ↓
    expand abbreviations
        ↓
    prepend system prompt
    """

    system_prompt = load_system_prompt()

    expanded_text = expand_abbreviations(coded_text)

    final_prompt = system_prompt + "\n\n" + expanded_text

    return final_prompt