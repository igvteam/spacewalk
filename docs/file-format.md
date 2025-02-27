---
layout: default
title: Spacewalk File Format
nav_order: 4
has_children: true
has_toc: true
---

# Spacewalk File Format

The Spacewalk binary file format (.sw) is an extensible format for the visualization of 3D genomic data with the Spacewalk visualization tool. The file stores spatial data associated with genomic regions from one or more experiments or ensembles. Each experiment has spatial data for multiple traces. Typical datasets include super-resolution chromatin tracing data and genomic simulation data.

## Key Features

The Spacewalk Binary File Format (.sw) is designed to provide:

- **Optimized Performance**  
  Efficient I/O is enabled by using streaming technology built atop the HDF5 file format.

- **Scalability**  
  Can accommodate very large datasets with little or no degradation in performance as file size scales up.

## Quick Links

- [Format Specification](file-format/specification): Detailed technical specification of the file format
- [Data Structure](file-format/data-structure): Information about file organization and data types
- [Tools & Utilities](file-format/tools): Tools for working with Spacewalk files
- [Legacy Format](file-format/legacy): Documentation for the deprecated text-based format

## Convert Your Data

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/turner/swt2sw/blob/main/docs/CSVtoSpacewalk.ipynb)

Use our Google Colab Notebook for a detailed example of how to convert a simple CSV file to Spacewalk Binary File format.
