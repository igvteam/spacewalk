---
layout: default
title: Interface Components
parent: User Guide
nav_order: 2
---

# Interface Components

Spacewalk is organized around three main visualization panels, each providing a unique perspective on your genomic data.

## 3D Structure Viewer

The 3D structure represents the spatial folding of a chromosome. 3D interaction is inherently linked to the 1D genomic coordinate system of base pairs.
The vertical color bar at right establishes a visual and interactive link between 3D space and genomic space.

As you move the cursor over the color bar, a region of the 3D structure is highlighted based on its corresponding genomic location:

![3d-interaction-series](../img/sw-3d-interaction-series.jpg)

## Hi-C Map Viewer

The Hi-C map shows the frequency of contact between different parts of the chromosome. The highlighted locations on the 3D structure show 
where those contacts occur on the 3D structure. This linked interaction establishes a powerful visual correspondence between these two aspects 
of the 3D structure: adjacency and spatial location.

![hic-interaction-0](../img/sw-hic-interaction-0.jpg)
![hic-interaction-1](../img/sw-hic-interaction-1.jpg)
![hic-interaction-2](../img/sw-hic-interaction-2.jpg)

## Genomic Track Viewer

The IGV browser displays tracks showing histone modifications from ChIP-seq data as a bar chart of signal intensities. 
As you move your cursor across the IGV track, the corresponding genomic location on the 3D structure is highlighted:

![igv-interaction-0](../img/sw-igv-interaction-0.jpg)
![igv-interaction-1](../img/sw-igv-interaction-1.jpg)
![igv-interaction-2](../img/sw-igv-interaction-2.jpg)
![igv-interaction-3](../img/sw-igv-interaction-3.jpg)
