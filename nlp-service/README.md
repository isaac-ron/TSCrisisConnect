---
base_model:
- crisistransformers/CT-M1-Complete
---
## CrisisTransformers Mini Models

This is the *Tiny* variant among the mini models (Medium, Small, Tiny) that were introduced in the paper ["Actionable Help" in Crises: A Novel Dataset and Resource-Efficient Models for Identifying Request and Offer Social Media Posts](https://arxiv.org/abs/2502.16839).

These models are the first crisis-specific mini models optimized for deployment in resource-constrained settings. Across 13 crisis classification tasks, our mini models surpass BERT (also outperform or match the performance of RoBERTa, MPNet, and BERTweet), offering higher accuracy with significantly smaller sizes and faster speeds. The Medium model is 47% smaller with 3.8% higher accuracy at 3.5x speed, the Small model is 68% smaller with a 1.8% accuracy gain at 7.7x speed, and the Tiny model, 83% smaller, matches BERT's accuracy at 18.6x speed. All models outperform existing distilled variants, setting new benchmarks. Refer to the [associated paper](https://arxiv.org/abs/2502.16839) for more details.

## Architecture
| mini model | # attention heads | # layers | intermediate size| output size | # parameters | source |
|--|--|--|--|--|--|--|
|Medium|8|8|2048|512|58 million| [crisistransformers/medium](https://huggingface.co/crisistransformers/medium) |
|Small|6|6|1536|384|35 million| [crisistransformers/small](https://huggingface.co/crisistransformers/small) |
|Tiny|4|4|1024|256|19 million| [crisistransformers/tiny](https://huggingface.co/crisistransformers/tiny) |

## Uses
These models should be finetuned for downstream tasks just like [BERT](https://huggingface.co/bert-base-cased) and [RoBERTa](https://huggingface.co/roberta-base).

## Citation
If you use these models in your research/project, please cite the following paper:
```
@article{lamsal2025actionable,
      title={"Actionable Help" in Crises: A Novel Dataset and Resource-Efficient Models for Identifying Request and Offer Social Media Posts}, 
      author={Rabindra Lamsal and
		      Maria Rodriguez Read and
		      Shanika Karunasekera and
              Muhammad Imran},
      year={2025},
      eprint={2502.16839},
      archivePrefix={arXiv},
      primaryClass={cs.CL}
}
```