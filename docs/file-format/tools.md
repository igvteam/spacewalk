---
layout: default
title: Tools & Utilities
parent: File Format
nav_order: 3
---

# Tools & Utilities

## HDF5 Indexer

The [`hdf5-indexer`](https://github.com/jrobinso/hdf5-indexer) tool optimizes data retrieval and enables efficient streaming of large `.sw` files by creating an index mapping each dataset's path to its file offset.

### Installation

```bash
pip install git+https://github.com/jrobinso/hdf5-indexer.git
```

### Usage

1. **Index a File**
   ```bash
   h5index example.sw
   ```
   Creates and embeds an index as a top-level dataset named `_index`

2. **Verify Index**
   ```bash
   h5extract example.sw
   ```
   Displays the embedded `_index` dataset

### Benefits
- Direct dataset retrieval without full file traversal
- Improved streaming performance
- Efficient random access to data segments

## Format Conversion

### CSV to Spacewalk Converter

Try our interactive Google Colab notebook to convert CSV data to Spacewalk format:
[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/turner/swt2sw/blob/main/docs/CSVtoSpacewalk.ipynb)

### Legacy Format Migration

Use the [swt2sw](https://github.com/turner/swt2sw) tool to convert legacy `.swt` files to the new `.sw` format.
