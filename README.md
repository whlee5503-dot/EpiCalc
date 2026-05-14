# EpiCalc — Free Public Health Calculator

[![Live Demo](https://img.shields.io/badge/Live%20Demo-epi.chem--health--calc.com-brightgreen)](https://epi.chem-health-calc.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Built with React](https://img.shields.io/badge/Built%20with-React%20%2B%20TypeScript-blue)](https://react.dev)
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.20181520.svg)](https://doi.org/10.5281/zenodo.20181520)

---

### 🌐 SDG Alignment
EpiCalc contributes to the UN Sustainable 
Development Goal 3 (Good Health and Well-being), 
specifically Target 3.d: strengthening early 
warning systems and risk reduction for national 
and global health risks. By providing free, 
offline-capable epidemiology and biostatistics 
tools, EpiCalc supports evidence-based 
decision-making for public health workers in 
low-resource settings worldwide.

[![SDG 3](https://img.shields.io/badge/SDG-3%20Good%20Health-brightgreen)](https://sdgs.un.org/goals/goal3)

---

A free, mobile-friendly, open-source web application for epidemiology metrics, epidemic simulation, and biostatistics — designed for MPH students, medical students, clinical researchers, and public health practitioners worldwide.

> 🌍 **Mission**: To make essential public health calculation tools freely accessible to health workers in low-resource settings, including offline use in areas with limited internet connectivity.

---

## 🖥️ Live Demo

**[https://epi.chem-health-calc.com](https://epi.chem-health-calc.com)**

No login required. Works on mobile. Dark mode supported.

---

## 📱 Install as Mobile App (PWA)

EpiCalc can be installed as a native-like app on your smartphone — no App Store needed.

- **Android (Chrome)**: Menu (⋮) → "Add to Home Screen"
- **iPhone (Safari)**: Share (□↑) → "Add to Home Screen"

Once installed, EpiCalc launches like a native app and supports offline use.

EpiCalc is platform-independent — compatible 
with Android, iOS, and any modern web browser. 
Once installed, it operates fully offline, 
suitable for areas with limited or no internet 
connectivity.

---

## ✨ Features

### 📊 Epidemiology Metrics
- **Risk Metrics** — Relative Risk (RR), Odds Ratio (OR), ARR, NNT with 95% CI visualization
- **Disease Frequency** — Attack Rate, Secondary Attack Rate, CFR, Crude & Age-adjusted Mortality Rate
- **Vaccine Efficacy** — VE, Herd Immunity Threshold (HIT), Number Needed to Vaccinate (NNV)
- **Burden of Disease** — DALYs, YLL, YLD

### 🔬 Screening Test Performance
- Sensitivity, Specificity, PPV, NPV
- Likelihood Ratios (LR+, LR−)
- Interactive 2×2 test matrix

### 🦠 Epidemic Simulator (SIR / SEIR)
- Real-time R₀ visualization
- Herd immunity threshold
- Vaccination rate effect simulation
- Peak day & total case estimation

### 📈 Biostatistics Calculator
- **Sample Size** — Two-proportion test with Power Curve
- **Z-Test** — One/Two-sample with Normal distribution visualization
- **Independent t-Test** — t-distribution with rejection region
- **Chi-Square Test** — r×c contingency table with χ²-distribution
- **ANOVA (F-Test)** — Group comparison with Summary Table

---

## 🎯 Target Users

- MPH students & public health faculty
- Medical students & clinical researchers
- Epidemiologists & field health workers
- Public health workers in low-resource settings (developing countries)

---

## 🌍 Global Health Vision

EpiCalc is being developed with a dual mission:

- **High-income settings**: Full-featured web app (free + optional Pro tier)
- **Low-resource settings**: Lightweight, offline-capable PWA — freely available to public health workers in sub-Saharan Africa, Southeast Asia, and other underserved regions

We are actively exploring partnerships with organizations such as WHO, AFENET, and global health funders to support this mission.

---

## 🔒 Privacy & Data Policy
EpiCalc does not collect, store, or transmit 
any personally identifiable information (PII). 
All calculations are performed entirely on the 
client side (browser/device). No data is sent 
to any external server. Safe for use in 
sensitive public health contexts.

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| Frontend | React 18 + TypeScript |
| Build Tool | Vite |
| Charts | Recharts |
| Styling | CSS Variables (Dark mode support) |
| i18n | Korean / English toggle |
| Deployment | Cloudflare Pages |
| Dev Environment | Firebase Studio |

---

## 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/whlee5503-dot/EpiCalc.git
cd EpiCalc

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

---

## 📐 Mathematical Formulas

All calculations are based on standard epidemiological and statistical formulas:

```
# Risk Metrics
RR = [a/(a+b)] / [c/(c+d)]
OR = (a×d) / (b×c)
95% CI for RR = exp(ln(RR) ± 1.96 × √(1/a - 1/(a+b) + 1/c - 1/(c+d)))

# SIR Model
dS/dt = -β×S×I/N
dI/dt = β×S×I/N - γ×I
dR/dt = γ×I
R₀ = β/γ

# Sample Size (Two-proportion)
n = (Zα/2 + Zβ)² × [p1(1-p1) + p2(1-p2)] / (p1-p2)²

# Vaccine Efficacy
VE = (1 - RR) × 100
HIT = 1 - (1/R₀)

# DALYs
DALY = YLL + YLD
YLL = deaths × remaining life expectancy
YLD = cases × disability weight × duration
```

---

## 📁 Project Structure

```
epicalc/
├── src/
│   ├── components/
│   │   ├── EpiCalculator/     # Epidemiology metrics
│   │   ├── Screening/         # Screening test performance
│   │   ├── SIRSimulator/      # SIR/SEIR epidemic simulator
│   │   └── BiostatCalc/       # Biostatistics calculator
│   ├── utils/
│   │   └── epidemiology.ts    # Core calculation functions
│   ├── styles/
│   │   └── variables.css      # CSS variables (dark mode)
│   └── i18n/                  # Korean/English translations
├── public/
└── index.html
```

---

## 🤝 Contributing

EpiCalc is designed in accordance with the 
[Principles for Digital Development](https://digitalprinciples.org/).

Contributions are welcome! This project is especially looking for:

- **Translations** — Multiple languages planned (for global health reach)
- **Formula validation** — Epidemiologists and biostatisticians welcome
- **Mobile UX improvements** — For low-resource device optimization
- **Bug reports & feature requests** — Via GitHub Issues

Please read our contributing guidelines before submitting a PR.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

Free to use, modify, and distribute — including for use in developing countries and resource-limited settings.

---

## 👨‍💻 About the Developer

**Won Ho Lee, Ph.D.**
- Chemical Engineering (PhD) | MPH | MDiv
- Former MPH faculty — Biostatistics & Foundations of Public Health
- University of Utah MPH Alumni

EpiCalc was built out of a deep, enduring connection to public health — and a hope that essential tools should be accessible to every health worker, regardless of where they work.

---

## 📬 Feedback

Found a bug or have a suggestion?
- Use the **Feedback button** in the app
- Open a [GitHub Issue](https://github.com/whlee5503-dot/EpiCalc/issues)

---

> *"Essential public health tools should be accessible to every health worker, regardless of where they work."*
