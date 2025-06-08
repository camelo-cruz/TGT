import spacy
from spacy.tokens import DocBin

def build_docbin(
    lang: str,
    texts: list[str],
    morphs: list[list[str]],
    lemmas: list[list[str]],
    path_out: str,
):
    # 1) Create a blank pipeline so we can tokenize
    nlp = spacy.blank(lang)

    # 2) Instruct DocBin to store lemmas & morph info
    docbin = DocBin(attrs=["MORPH"], store_user_data=True)

    for text, morph_list in zip(texts, morphs):
        # 3) Tokenize
        doc = nlp(text)

        # 4) Assign gold annotations
        for token, morph in zip(doc, morph_list):
            token.morph = morph      # e.g. "Number=Sing|Tense=Past"

        # 5) Add to our DocBin
        docbin.add(doc)

    # 6) Dump to disk, so your config’s `paths.train` can point here
    docbin.to_disk(path_out)

# Example usage
build_docbin(
    lang="en",
    texts=["I ran home.", "She walks."],
    morphs=[
      ["Person=1|Tense=Past", "Number=Sing", "Case=Nom"],   # per token
      ["Person=3|Number=Sing", "Mood=Ind|Tense=Pres"]
    ],
    lemmas=[
      ["I","run","home","."],
      ["She","walk","."]
    ],
    path_out="data/train.spacy",
)
