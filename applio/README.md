# Applio Voice Model Training

This branch adds a clean workflow for training an Applio voice-conversion model from a Google Drive dataset.

## Workflow

```text
Google Drive/Applio_Training/dataset/
        ↓
Dataset validation
        ↓
Applio Colab or GPU VM
        ↓
Pre-process dataset
        ↓
RMVPE feature extraction
        ↓
Train model and checkpoints
        ↓
Train FAISS index
        ↓
Google Drive/Applio_Training/output_models/
```

## Dataset contract

Place clean, lossless vocal files in:

```text
My Drive/
└── Applio_Training/
    ├── dataset/
    └── output_models/
```

Preferred input formats are `.wav` or `.flac`. The official Applio guidance recommends approximately 10–30 minutes of clean audio with minimal background noise, reverb, or artifacts. The dataset should contain one speaker unless a multi-speaker model is intentionally configured.

## Training defaults

These are starting points, not fixed guarantees:

- Model name: `Custom_Voice_Model`
- Sample rate: choose `32k`, `40k`, or `48k` to match the source/pre-trained model
- Pitch extraction: `RMVPE`
- Save every epoch: `25`
- Total epochs: start around `300`, then use loss/TensorBoard to decide whether to stop earlier or resume
- Batch size: start conservatively and reduce by half if CUDA out-of-memory occurs
- Vocoder: `HiFi-GAN` for a general starting point; `NSF HiFi-GAN` can be useful for singing

## Important

Do not commit Google credentials, OAuth tokens, private audio, model checkpoints, or generated indexes to Git. The runtime will mount or copy these from Google Drive and export only to the Drive output folder.

The exact Applio UI/CLI parameters are intentionally kept configurable because the official repository and notebooks may update over time.

References:

- [Applio official repository](https://github.com/iahispano/Applio)
- [Applio training documentation](https://docs.applio.org/getting-started/training/)
- [Applio UI Colab notebook](https://colab.research.google.com/github/iahispano/applio/blob/main/assets/Applio.ipynb)
- [Applio No-UI Colab notebook](https://colab.research.google.com/github/iahispano/applio/blob/main/assets/Applio_NoUI.ipynb)

## Next steps

1. Add vocal files to the Drive dataset folder.
2. Run `python scripts/validate_dataset.py --dataset /path/to/dataset` in the GPU runtime.
3. Mount Drive and launch the official Applio notebook.
4. Run preprocessing, RMVPE extraction, training, and index generation.
5. Export the selected `.pth` and `.index` files to `output_models/`.
6. Verify the exported files and checkpoint metadata before ending the session.

Only the `applio-training` branch is used for this workflow. The existing AI rap-video implementation remains unchanged on `main`.

## Responsible use

Use only audio for which you have the necessary rights and permission. Do not use the workflow to impersonate people or publish voice content without appropriate consent.

License and terms for Applio itself are governed by the official Applio project.

