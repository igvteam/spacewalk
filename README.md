# Spacewalk

An interactive 3D visualization application for super-resolution microscopy data, featuring seamless integration with IGV genomics browser ([igv.js](https://github.com/igvteam/igv.js)) and Juicebox Hi-C map viewer ([juicebox.js](https://github.com/igvteam/juicebox.js)).

🚀 **Spacewalk is hosted at Aiden Lab**: [Spacewalk](https://aidenlab.org/spacewalk/)

## Features

- Interactive 3D visualization of:
  - Super-resolution microscopy (SRM) data
  - Chromatin simulations
  - Other forms of genome microscopy and spatial genomics
- Two visualization modes:
  - **Point Cloud**: Renders 3D point clusters for OlioSTORM data
  - **Ball & Stick**: Displays chromatin centroids with connecting cylinders
- Real-time interaction between genomic coordinates and 3D structure
- Integrated genome browser and Hi-C map visualization

After launching the app, you will see a screen with a single empty 3D viewer. Use the **File** dropdown menu to load 3D structure into the 3D viewer.

![file load](readme_img/spacewalk-file-load.png)

## Visualization Modes

### Point Cloud
The point cloud is rendered as a collection of 3D point clusters, each corresponding to a specific genomic extent.
The color of each cluster is determined by the genomic navigator's color ramp bar, located on the right side of the 3D viewer.
When you mouse over the genomic navigator the corresponding 3D point cluster is highlighted.

![point cloud render style](readme_img/render-style-point-cloud.png)

### Ball & Stick
Chromatin centroids are rendered as balls, each colored according to its genomic location.
Sticks (cylinders) connect the balls in the order they appear along the genomic range.
As the user moves the cursor along the genomic navigator on the right side of the 3D viewer,
the corresponding ball is highlighted based on its genomic location.

![ball & stick render style](readme_img/render-style-ball-stick.png)

## Core Components

![spacewalk panel_description](readme_img/spacewalk-panel-description.png)

Spacewalk is organized around three visualization panels, each responsible for one aspect of genomic visualization:

### 1. 3D Structure Viewer
<table>
  <tr>
    <td style="width: 50%; vertical-align: top;">
      <img src="readme_img/3d.jpg" alt="3D Structure Viewer" style="max-width: 100%; height: auto;"/>
    </td>
    <td style="width: 50%; padding-left: 15px; vertical-align: top;">
      <p>
        The 3D structure represents the spatial folding of a chromosome. 
        3D interaction is inherently linked to the 1D genomic coordinate system of base pairs.
        The vertical color bar at right establishes a visual and interactive link
        between 3D space and genomic space. As the user moves the cursor over the color bar,
        a region of the 3D structure is highlighted based on its corresponding genomic location.
      </p>
    </td>
  </tr>
</table>

This image series shows the cursor moving along the genomic extent of the 3D structure. 
Notice the highlighting of the 3D structure during the interaction:
![3d-interaction-series](readme_img/sw-3d-interaction-series.jpg)

### 2. Hi-C Map Viewer
<table>
  <tr>
    <td style="width: 50%; vertical-align: top;">
      <img src="readme_img/hic.jpg" alt="Hi-C Map Viewer" style="max-width: 100%; height: auto;"/>
    </td>
    <td style="width: 50%; padding-left: 15px; vertical-align: top;">
      <p>
        The Hi-C map shows the frequency of contact between different parts of the chromosome. 
        In the series of images that follow, the highlighted locations on the 3D structure show 
        where those contacts occur on the 3D structure. This linked interaction establishes a 
        powerful visual correspondence between these two aspects of the 3D structure: adjacency 
        and spatial location.
      </p>
    </td>
  </tr>
</table>

![hic-interaction-0](readme_img/sw-hic-interaction-0.jpg)
![hic-interaction-1](readme_img/sw-hic-interaction-1.jpg)
![hic-interaction-2](readme_img/sw-hic-interaction-2.jpg)

### 3. Genomic Track Viewer
<table>
  <tr>
    <td style="width: 50%; vertical-align: top;">
      <img src="readme_img/igv.jpg" alt="Genomic Track Viewer" style="max-width: 100%; height: auto;"/>
    </td>
    <td style="width: 50%; padding-left: 15px; vertical-align: top;">
      <p>
        The IGV browser has a pair of tracks showing histone modifications from ChIP-seq data displayed 
        as a bar chart of signal intensities. In the series of images below, as the cursor moves across 
        the IGV track, notice how the corresponding genomic location on the 3D structure is highlighted.
      </p>
    </td>
  </tr>
</table>

![igv-interaction-0](readme_img/sw-igv-interaction-0.jpg)
![igv-interaction-1](readme_img/sw-igv-interaction-1.jpg)
![igv-interaction-2](readme_img/sw-igv-interaction-2.jpg)
![igv-interaction-3](readme_img/sw-igv-interaction-3.jpg)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Version

Current version: 7.0.0

## Developer Installation

This section is for developers who want to run their own instance of Spacewalk.

### Prerequisites
- Node.js >= v20.8.0
- npm >= v10.1.0
- Modern web browser with ECMAScript 2015 support

### Installation Steps

```bash
# Clone the repository
git clone https://github.com/igvteam/spacewalk.git

# Navigate to project directory
cd spacewalk

# Install dependencies
npm install

# Build the application
npm run build

# Start the server
npm run start
```

Visit `localhost:8080/index.html` in your browser to launch your local instance of the application.
