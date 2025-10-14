# Spacewalk

Spacewalk is an interactive 3D visualization application for super-resolution microscopy data. Spacewalk supports integrated genomic analysis via a fully featured IGV genomics browser [igv.js](https://github.com/igvteam/igv.js) and Juicebox Hi-C map viewer [juicebox.js](https://github.com/igvteam/juicebox.js)

## Try It Now

Spacewalk is hosted at [Aiden  Lab](https://aidenlab.org). Launch the main by clicking [here](https://aidenlab.org/spacewalk).

Experience Spacewalk immediately with these demos:

- **[Ball & Stick Demo](https://tinyurl.com/25audeaa)**  
  Chromatin centroids are rendered as balls, each colored according to its genomic location. 
  Sticks (cylinders) connect the balls in the order they appear along the genomic range.

- **[Point Cloud Demo](https://tinyurl.com/23lwr5u6)**  
The point cloud is rendered as a collection of 3D point clusters, each point cluster corresponds to a specific genomic extent and is colored according to the genomic location of that extent.

## Documentation

Visit our [Documentation Site](https://igvteam.github.io/spacewalk/) for:
- User Guide
- Developer Guide
- File Format Specifications
- Example Data

## Features

- Interactive 3D visualization of genomic data
- Multiple visualization modes:
  - Ball & Stick for structural connections
  - Point Cloud for dense spatial data
- Integrated genomic views
- Shareable visualization states
- Support for various data formats

## Development

### Requirements
- Node.js
- npm

### Setup
```bash
git clone https://github.com/igvteam/spacewalk.git
cd spacewalk
npm install
npm start
```

### Build
```bash
npm run build
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Version

Current version: 7.0.0
