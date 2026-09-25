# Google Colab setup

This guide is the first-run checklist for the `applio-training` branch.

## 1. Open the official notebook

Use one of the official Applio notebooks:

- UI notebook: <https://colab.research.google.com/github/iahispano/applio/blob/main/assets/Applio.ipynb>
- No-UI notebook: <https://colab.research.google.com/github/iahispano/applio/blob/main/assets/Applio_NoUI.ipynb>

Select a GPU runtime and verify that CUDA is visible before starting a long run.

## 2. Prepare Google Drive

Create:

```text
My Drive/Applio_Training/dataset/
My Drive/Applio_Training/output_models/
```

Place only consented vocal recordings in `dataset/`. Keep credentials and private model files out of GitHub.

## 3. Validate before training

After Drive is mounted, run:

```bash
python /content/ai-rap-youtube-bot/scripts/validate_dataset.py \
  --dataset /content/drive/MyDrive/Applio_Training/dataset
```

If the repository is not cloned into `/content/ai-rap-youtube-bot`, adjust the script path.

## 4. Applio training sequence

Follow the official Applio UI/notebook sequence:

1. Select a model name.
2. Choose a sample rate that matches the selected pre-trained model (`32k`, `40k`, or `48k`).
3. Pre-process the dataset.
4. Extract features with `RMVPE` and the appropriate embedder.
5. Train the model and save checkpoints every 10–50 epochs.
6. Monitor TensorBoard and reduce batch size if CUDA OOM occurs.
7. Train the FAISS index after model training.
8. Export the selected `.pth` and matching `.index` files.

Starting values for this project are model name `Custom_Voice_Model`, save interval `25`, total epochs around `300`, and a conservative batch size. Training length must be decided from loss and audio quality, not from epoch count alone.

## 5. Export and verify

Copy the final matching files to:

```text
/content/drive/MyDrive/Applio_Training/output_models/
```

Before ending the runtime, verify that both files exist, have non-zero size, and use the same model name. Keep checkpoints in Drive if a Colab session may disconnect.

## Session safety

Colab sessions can terminate. Do not rely on a single uninterrupted run. Save checkpoints to Drive and resume with the same sample rate and batch size when continuing.
