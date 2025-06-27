import random
import tempfile
import os
import spacy
import srsly
from pathlib import Path
from spacy.tokens import DocBin
from spacy.training.corpus import Corpus
from spacy.training.initialize import init_nlp
from spacy.training.loop import train as train_nlp
from spacy.util import load_config
from spacy.cli._util import setup_gpu, show_validation_error
from wasabi import msg

# Metrics to collect during evaluation
METRICS = ["token_acc", "morph_acc"]

def chunk(items: list, n: int):
    """Split items into n roughly equal chunks."""
    k, m = divmod(len(items), n)
    return [items[i*k + min(i, m):(i+1)*k + min(i+1, m)] for i in range(n)]


def flatten(list_of_lists: list[list]):
    """Flatten one level of nesting."""
    return [x for sub in list_of_lists for x in sub]


def run_training(
    lang: str,
    data_dir: str,
    model: str = None,   # ← new arg: path to an existing spaCy model
    n_folds: int = 10,
    shuffle: bool = False,
    use_gpu: int = 0,
):
    script_dir = Path(__file__).parent
    config_path = str(script_dir / "config.cfg")
    output_path = str(script_dir / "output" / f"results-{lang}.json")
    os.makedirs(Path(output_path).parent, exist_ok=True)
    setup_gpu(use_gpu)

    # build data
    docbin = build_docbin(lang, data_dir)
    docs = list(docbin.get_docs(spacy.blank(lang).vocab))
    if shuffle:
        random.shuffle(docs)
    folds = chunk(docs, n_folds)
    all_scores = {m: [] for m in METRICS}

    for idx, dev in enumerate(folds):
        train = flatten([f for i, f in enumerate(folds) if i != idx])
        msg.divider(f"Fold {idx+1} — train {len(train)}, dev {len(dev)}")

        with tempfile.TemporaryDirectory() as tmpdir:
            train_path = os.path.join(tmpdir, "train.spacy")
            dev_path   = os.path.join(tmpdir, "dev.spacy")
            DocBin(docs=train).to_disk(train_path)
            DocBin(docs=dev).to_disk(dev_path)

            if model:
                msg.info(f"Loading base model from {model}")
                nlp = spacy.load(model)
                config = nlp.config
                overrides = {
                    "paths.train": train_path,
                    "paths.dev":   dev_path,
                    "nlp.lang":    lang,
                }
            else:
                overrides = {
                    "paths.train": train_path,
                    "paths.dev":   dev_path,
                    "nlp.lang":    lang,
                }

            with show_validation_error(config_path, hint_fill=False):
                config = load_config(config_path, overrides, interpolate=False)
                
            nlp = init_nlp(config)

            # Now you have a valid config with train/dev paths set:
            nlp, _ = train_nlp(nlp, None)

            corpus = Corpus(dev_path, gold_preproc=False)
            scores = nlp.evaluate(list(corpus(nlp)))
            for m in METRICS:
                all_scores[m].append(scores.get(m, 0.0))


    # report averages
    avg = {m: sum(v if v is not None else 0.0 for v in vals)/len(vals)
           for m, vals in all_scores.items()}
    msg.table(avg, header=("Metric","Score"))
    srsly.write_json(output_path, avg)
    msg.good(f"Saved results to {output_path}")

    # save the last nlp to disk
    output_name = f"{lang}_custom_glossing" if not model else f"{model}_custom_glossing"
    model_output = script_dir / "models" / output_name
    os.makedirs(model_output, exist_ok=True)
    nlp.to_disk(model_output)
    msg.good(f"Saved trained model to {model_output}")



if __name__ == "__main__":
    run_training(lang="de", 
                data_dir='/Users/alejandra/Library/CloudStorage/OneDrive-FreigegebeneBibliotheken–Leibniz-ZAS/Leibniz Dream Data - Studies/tests_alejandra/german/Session_1152193 glossing',
                #model="de_dep_news_trf",
                n_folds=5, shuffle=True, use_gpu=0)