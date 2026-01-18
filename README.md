# Tetris with Moderate Assistive AI  
**uOttaHack 8 — University Hackathon Project**

## Context and Motivation

This project was developed during **uOttaHack 8**, a university-level hackathon organized at the University of Ottawa.  
The challenge was to design an interactive system combining real-time decision-making, algorithmic reasoning, and user interaction under strict time constraints.

Rather than implementing a fully autonomous agent, this project explores a **human-in-the-loop** approach, where algorithmic assistance supports — but does not replace — the player.


## Project Objective

The goal of this project is to implement a **moderate assistive system** for the game Tetris that:

- Analyzes the current game state in real time  
- Evaluates multiple candidate placements for the active tetromino  
- Highlights the most favorable placement according to defined heuristics  
- Preserves full player control over all actions  

The assistant never plays automatically and does not enforce decisions.



## Assistive Logic Overview

The assistive system relies on deterministic evaluation rather than learned models.  
For each tetromino, all feasible placements (rotation × horizontal position) are simulated and scored.

The evaluation is based on **feature engineering** concepts commonly used in AI and optimization problems.

### Engineered Features

The placement scoring function is derived from the following features:

- **Hole count**  
  Number of empty cells located beneath at least one filled cell.

- **Stack height**  
  Maximum vertical height of occupied cells after placement.

- **Surface stability**  
  Penalization of uneven surfaces that increase future placement difficulty.

These features are combined into a weighted scoring function that approximates long-term board stability.


## Technical Competencies Demonstrated

This project highlights several technical skills relevant to AI-oriented software engineering:

- Feature engineering for heuristic-based decision systems  
- State-space exploration under real-time constraints  
- Grid-based simulation and evaluation  
- Deterministic scoring models for optimization  
- Human-in-the-loop system design  
- Separation of decision support and control logic  
- Efficient cloning and evaluation of board states  

Although no machine learning model is trained, the methodology mirrors early-stage AI pipeline design, particularly in **search-based reasoning** and **feature-driven evaluation**.



## Technical Scope

- Language: JavaScript (browser-based)
- Rendering: HTML5 Canvas
- Architecture: Real-time single-player loop
- Dependencies: None (vanilla implementation)
- Model: Deterministic heuristic evaluation

## Visual Documentation


**Figure 1** 
![Assistive highlight example](images/Screenshot2026-01-17014202.png)

**Figure 2** – Board state without assistive suggestion  
![Unassisted board](images/Screenshot2026-01-17212600.png)

**Figure 3** – Comparison of evaluated candidate placements  
![Placement comparison](images/Screenshot2026-01-17212654.png)



## Conclusion

This project demonstrates how feature-engineered heuristics can provide meaningful assistance in interactive environments without removing user agency.  
The approach reflects foundational AI concepts applicable to optimization, planning, and decision-support systems beyond games.








