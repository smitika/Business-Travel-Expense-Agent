from ragas import evaluate
import ragas.metrics
from datasets import Dataset
from dotenv import load_dotenv
import json

load_dotenv()

with open("eval_data.json", "r") as f:
    data = json.load(f)

dataset = Dataset.from_list([
    {
        "id": d["id"],
        "question": d["question"],
        "answer": d["answer"],
        "ground_truth": d["ground_truth"],
        "contexts": d["contexts"]
    }
    for d in data
])

result = evaluate(
    dataset=dataset,
    metrics=[
        ragas.metrics.faithfulness,
        ragas.metrics.answer_relevancy,
        ragas.metrics.context_recall,
        ragas.metrics.context_precision,
        ragas.metrics.answer_correctness
    ]
)

print(result)
result.to_pandas().to_csv("ragas_results.csv", index=False)
print("Saved to ragas_results.csv")