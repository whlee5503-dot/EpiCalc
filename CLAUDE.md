# EpiCalc Project Guidelines

## Developer Background
- MPH (Biostatistics, 2yr teaching experience)
- Chemical Engineering PhD
- Vibe coding developer (Firebase Studio + Claude Code)

## Tech Stack
- React + TypeScript + Vite
- Firebase Studio (dev), Cloudflare Pages (deploy)
- CSS Variables (dark mode), recharts, Formspree

## Code Principles
- Responses in Korean, code in English
- TypeScript strict mode
- Always support dark mode + mobile responsive
- Reuse CSS variable patterns from reactor-design app

## Project Structure
epicalc/
├── src/
│   ├── components/
│   │   ├── EpiCalculator/   # Step 1: Epi metrics
│   │   ├── SIRSimulator/    # Step 2: Infection simulator
│   │   ├── BiostatCalc/     # Step 3: Biostatistics
│   │   └── EnvHealthRisk/   # Step 4: Env health risk
│   ├── utils/epidemiology.ts
│   ├── styles/variables.css
│   └── i18n/

## Key Formulas
### Epidemiology
RR = (a/(a+b)) / (c/(c+d))
OR = (a*d) / (b*c)
ARR = |p1 - p2|
NNT = 1 / ARR
95% CI for RR = exp(ln(RR) ± 1.96 * sqrt(1/a - 1/(a+b) + 1/c - 1/(c+d)))
95% CI for OR = exp(ln(OR) ± 1.96 * sqrt(1/a + 1/b + 1/c + 1/d))

Sensitivity = a / (a+c)
Specificity = d / (b+d)
PPV = a / (a+b)
NPV = d / (c+d)

### SIR Model
dS/dt = -β*S*I/N
dI/dt = β*S*I/N - γ*I
dR/dt = γ*I
R0 = β/γ

## Copyright Rules
- No copying from textbooks (Rothman, Gordis, etc.)
- Use only self-created example data
- Mathematical formulas are free to use