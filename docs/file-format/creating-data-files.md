---
layout: default
title: Creating Data Files
parent: File Format
nav_order: 5
---

# Creating Spacewalk Data Files

There are several ways to create a Spacewalk Binary File (`.sw`). Choose the method that best matches your source data:

## From CSV Data

If your data is in CSV format with columns for genomic positions and 3D coordinates, you can use our interactive notebook:

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/turner/swt2sw/blob/main/docs/CSVtoSpacewalk.ipynb)

The notebook guides you through:
1. Loading your CSV data
2. Formatting genomic positions and spatial coordinates
3. Creating a properly structured `.sw` file
4. Validating the output

Example input CSV format:
```csv
chromosome,start,end,x,y,z
chr1,1000000,2000000,0.5,1.2,3.4
chr1,2000000,3000000,1.5,2.2,4.4
```

## From Legacy Format

If you have data in the legacy Spacewalk Text format (`.swt`), use the [swt2sw](https://github.com/turner/swt2sw) conversion tool:

1. Install the tool:
   ```bash
   pip install git+https://github.com/jrobinso/hdf5-indexer.git
   pip install git+https://github.com/turner/swt2sw.git
   ```

2. Convert your file:
   - For Ball & Stick data:
     ```bash
     swt2sw -f input.swt -n output -single-point
     ```
   - For Point Cloud data:
     ```bash
     swt2sw -f input.swt -n output -multi-point
     ```

## Using HDF5 Directly

For advanced users who want to create `.sw` files programmatically:

```python
import h5py
import numpy as np

# Create file
with h5py.File('output.sw', 'w') as f:
    # Add header
    header = f.create_group('header')
    header.attrs['format'] = 'sw'
    header.attrs['genome'] = 'hg38'
    header.attrs['pointtype'] = 'SINGLE_POINT'  # or 'MULTI_POINT'

    # Add genomic positions
    genomic = f.create_group('genomic_position')
    regions = np.array([
        ['chr1', 1000000, 2000000],
        ['chr1', 2000000, 3000000]
    ])
    genomic.create_dataset('regions', data=regions)

    # Add spatial positions
    spatial = f.create_group('spatial_position')
    xyz = np.array([
        [0.5, 1.2, 3.4],
        [1.5, 2.2, 4.4]
    ])
    spatial.create_dataset('t_0', data=xyz)
```

## File Validation

After creating your `.sw` file:

1. Use [myHDF5](https://myhdf5.hdfgroup.org/) to inspect the file structure
2. Check that all required groups and attributes are present
3. Verify genomic positions are properly sorted
4. Ensure spatial coordinates match your expectations

## Common Issues

- **Missing Header Attributes**: Ensure all required attributes (format, genome, pointtype) are set
- **Unsorted Regions**: Genomic regions must be sorted by start position
- **Mismatched Counts**: Number of spatial positions must match genomic regions for single-point data
- **Invalid Genome ID**: Use standard genome identifiers (e.g., hg38, mm10)

## Need Help?

- Check the [File Format Specification](specification.md)
- See [Data Structure](data-structure.md) for detailed format information
- [Open an issue](https://github.com/igvteam/spacewalk/issues) if you encounter problems
