export type MetricType =
  | "RR"
  | "OR"
  | "ARR"
  | "NNT"
  | "sensitivity"
  | "specificity"
  | "PPV"
  | "NPV"
  | "R0";

export type Lang = "ko" | "en";

export interface MetricValues {
  value: number;
  ci_lower?: number;
  ci_upper?: number;
}

export interface InterpretationResult {
  summary: string;
  footnote: string;
  disclaimer: string;
  hit?: number;
}

// ─── constants ────────────────────────────────────────────────────────────────

const DISCLAIMER: Record<Lang, string> = {
  ko: "이 해석은 학습용 참고 기준이며, 실제 판단은 연구 설계, 신뢰구간, 유병률, 집단 특성을 함께 고려해야 합니다.",
  en: "These interpretations are for educational reference only. Clinical and epidemiological judgment should always consider study design, confidence intervals, prevalence, and population characteristics.",
};

// ─── helpers ────────────────────────────────────────────────────────────────

function ratioSummary(
  value: number,
  ci_lower: number | undefined,
  ci_upper: number | undefined,
  lang: Lang
): string {
  const hasCi = ci_lower !== undefined && ci_upper !== undefined;
  const crosses1 = hasCi ? ci_lower! < 1.0 && ci_upper! > 1.0 : null;

  if (lang === "ko") {
    if (!hasCi) {
      if (value > 1.0) return "위험 증가와 관련된 결과로 해석할 수 있습니다.";
      if (value < 1.0) return "보호 효과 가능성이 있습니다.";
      return "연관성이 없는 결과로 해석할 수 있습니다.";
    }
    if (!crosses1) {
      // CI does not include 1 → significant
      if (value > 1.0) return "위험 증가와 관련된 결과로 해석할 수 있으며, CI가 1을 포함하지 않아 통계적으로 유의할 가능성이 있습니다.";
      if (value < 1.0) return "보호 효과 가능성이 있으며, CI가 1을 포함하지 않아 통계적으로 유의할 가능성이 있습니다.";
      return "연관성이 없는 결과로 해석할 수 있으며, CI가 1을 포함하지 않아 통계적으로 유의할 가능성이 있습니다.";
    }
    // CI crosses 1 → not significant
    if (value > 1.0) return "위험 증가 가능성이 있으나, CI가 1을 포함해 유의성이 명확하지 않습니다.";
    if (value < 1.0) return "보호 효과 가능성이 있으나, CI가 1을 포함해 유의성이 명확하지 않습니다.";
    return "연관성이 없는 결과로 해석할 수 있으나, CI가 1을 포함해 유의성이 명확하지 않습니다.";
  }

  // English
  if (!hasCi) {
    if (value > 1.0) return "The result is consistent with increased risk.";
    if (value < 1.0) return "A protective effect is possible.";
    return "The result suggests no meaningful association.";
  }
  if (!crosses1) {
    if (value > 1.0) return "The result is consistent with increased risk. The CI does not include 1, suggesting statistical significance.";
    if (value < 1.0) return "A protective effect is possible. The CI does not include 1, suggesting statistical significance.";
    return "The result suggests no meaningful association. The CI does not include 1, suggesting statistical significance.";
  }
  if (value > 1.0) return "There is a possibility of increased risk, but the CI includes 1, so statistical significance is unclear.";
  if (value < 1.0) return "A protective effect is possible, but the CI includes 1, so statistical significance is unclear.";
  return "The result suggests no meaningful association, but the CI includes 1, so statistical significance is unclear.";
}

// ─── per-metric interpreters ─────────────────────────────────────────────────

function interpretRR({ value, ci_lower, ci_upper }: MetricValues, lang: Lang): InterpretationResult {
  const summary = ratioSummary(value, ci_lower, ci_upper, lang);
  const footnote = lang === "ko"
    ? "RR은 1을 기준으로 해석하며, 1보다 크면 위험 증가, 1보다 작으면 보호 효과를 시사합니다. 구간값은 학습용 기준이며, 실제 해석은 연구 설계와 신뢰구간을 함께 봐야 합니다."
    : "RR is interpreted relative to 1: values above 1 suggest increased risk, and values below 1 suggest a protective effect. Thresholds are educational guidelines; actual interpretation requires consideration of study design and confidence intervals.";
  return { summary, footnote, disclaimer: DISCLAIMER[lang] };
}

function interpretOR({ value, ci_lower, ci_upper }: MetricValues, lang: Lang): InterpretationResult {
  const summary = ratioSummary(value, ci_lower, ci_upper, lang);
  const footnote = lang === "ko"
    ? "해석은 RR과 유사하지만, 결과가 흔할수록 RR보다 크게 보일 수 있습니다. 구간값은 학습용 기준이며, 실제 해석은 연구 설계와 신뢰구간을 함께 봐야 합니다."
    : "Interpretation is similar to RR, but OR may overestimate RR when the outcome is common. Thresholds are educational guidelines; actual interpretation requires consideration of study design and confidence intervals.";
  return { summary, footnote, disclaimer: DISCLAIMER[lang] };
}

function interpretARR({ value }: MetricValues, lang: Lang): InterpretationResult {
  let summary: string;
  if (lang === "ko") {
    if (value > 0.1) summary = "임상적으로 의미 있는 절대 위험 감소로 볼 수 있습니다.";
    else if (value >= 0.01) summary = "중간 수준의 절대 위험 감소입니다.";
    else summary = "절대 위험 감소가 작아 임상적 의미를 신중히 평가해야 합니다.";
  } else {
    if (value > 0.1) summary = "This may represent a clinically meaningful absolute risk reduction.";
    else if (value >= 0.01) summary = "This represents a moderate absolute risk reduction.";
    else summary = "The absolute risk reduction is small; clinical significance should be evaluated carefully.";
  }
  const footnote = lang === "ko"
    ? "절대 위험 감소의 크기를 보여주며, 값이 클수록 개입 효과가 큽니다. 임상적 의미는 질환의 중증도, 부작용, 비용을 함께 고려해야 합니다."
    : "Reflects the magnitude of absolute risk reduction; larger values indicate greater intervention effect. Clinical significance should be assessed alongside disease severity, side effects, and costs.";
  return { summary, footnote, disclaimer: DISCLAIMER[lang] };
}

function interpretNNT({ value }: MetricValues, lang: Lang): InterpretationResult {
  let summary: string;
  if (lang === "ko") {
    if (value < 10) summary = "임상적으로 비교적 효율적인 개입으로 볼 수 있습니다.";
    else if (value <= 50) summary = "중등도의 임상적 효율성을 가진 개입입니다.";
    else summary = "절대적 이익이 작아 임상적 효용 판단에 주의가 필요합니다.";
  } else {
    if (value < 10) summary = "This can be considered a relatively efficient clinical intervention.";
    else if (value <= 50) summary = "This represents a moderately efficient clinical intervention.";
    else summary = "The absolute benefit is small; clinical utility should be carefully evaluated.";
  }
  const footnote = lang === "ko"
    ? "한 명의 유익한 결과를 얻기 위해 필요한 치료 대상 수를 뜻합니다. 임상적 의미는 질환의 중증도, 부작용, 비용을 함께 고려해야 합니다."
    : "NNT represents the number of patients who need to be treated to achieve one additional beneficial outcome. Clinical significance depends on disease severity, side effects, and costs.";
  return { summary, footnote, disclaimer: DISCLAIMER[lang] };
}

function interpretSensitivity({ value }: MetricValues, lang: Lang): InterpretationResult {
  let summary: string;
  if (lang === "ko") {
    if (value > 0.9) summary = "선별검사에 매우 적합합니다.";
    else if (value >= 0.7) summary = "대부분의 선별검사 목적에 적합합니다.";
    else summary = "단독으로는 선별검사에 적합하지 않습니다.";
  } else {
    if (value > 0.9) summary = "Highly suitable for screening.";
    else if (value >= 0.7) summary = "Acceptable for most screening purposes.";
    else summary = "Not suitable for screening when used alone.";
  }
  const footnote = lang === "ko"
    ? "질환이 있는 사람을 잘 찾아내는 능력입니다. 민감도는 선별검사에 더 적합합니다."
    : "Sensitivity measures the ability to correctly identify those with the disease. High sensitivity is more suitable for screening purposes.";
  return { summary, footnote, disclaimer: DISCLAIMER[lang] };
}

function interpretSpecificity({ value }: MetricValues, lang: Lang): InterpretationResult {
  let summary: string;
  if (lang === "ko") {
    if (value > 0.9) summary = "확인검사에 매우 적합합니다.";
    else if (value >= 0.7) summary = "대부분의 확인검사 목적에 적합합니다.";
    else summary = "단독으로는 확인검사에 적합하지 않습니다.";
  } else {
    if (value > 0.9) summary = "Highly suitable for confirmatory testing.";
    else if (value >= 0.7) summary = "Acceptable for most confirmatory purposes.";
    else summary = "Not suitable for confirmatory testing when used alone.";
  }
  const footnote = lang === "ko"
    ? "질환이 없는 사람을 잘 배제하는 능력입니다. 특이도는 확인검사에 더 적합합니다."
    : "Specificity measures the ability to correctly identify those without the disease. High specificity is more suitable for confirmatory testing.";
  return { summary, footnote, disclaimer: DISCLAIMER[lang] };
}

function interpretPPV({ value }: MetricValues, lang: Lang): InterpretationResult {
  let summary: string;
  if (lang === "ko") {
    if (value > 0.9) summary = "양성 결과의 신뢰도가 매우 높습니다.";
    else if (value >= 0.5) summary = "양성 결과를 신중히 해석해야 합니다.";
    else summary = "위양성이 많아 양성 결과 해석에 주의가 필요합니다.";
  } else {
    if (value > 0.9) summary = "A positive result is highly reliable.";
    else if (value >= 0.5) summary = "Positive results should be interpreted with care.";
    else summary = "False positives predominate; positive results require cautious interpretation.";
  }
  const footnote = lang === "ko"
    ? "양성 결과가 실제 질환일 가능성입니다. 유병률의 영향을 크게 받습니다."
    : "PPV represents the probability that a positive test result reflects true disease. It is strongly influenced by disease prevalence.";
  return { summary, footnote, disclaimer: DISCLAIMER[lang] };
}

function interpretNPV({ value }: MetricValues, lang: Lang): InterpretationResult {
  let summary: string;
  if (lang === "ko") {
    if (value > 0.9) summary = "음성 결과의 신뢰도가 매우 높습니다.";
    else if (value >= 0.5) summary = "음성 결과를 신중히 해석해야 합니다.";
    else summary = "위음성이 많아 음성 결과 해석에 주의가 필요합니다.";
  } else {
    if (value > 0.9) summary = "A negative result is highly reliable.";
    else if (value >= 0.5) summary = "Negative results should be interpreted with care.";
    else summary = "False negatives predominate; negative results require cautious interpretation.";
  }
  const footnote = lang === "ko"
    ? "음성 결과가 실제 비질환일 가능성입니다. 유병률의 영향을 크게 받습니다."
    : "NPV represents the probability that a negative test result reflects true absence of disease. It is strongly influenced by disease prevalence.";
  return { summary, footnote, disclaimer: DISCLAIMER[lang] };
}

function interpretR0({ value }: MetricValues, lang: Lang): InterpretationResult {
  const hit = value > 1 ? 1 - 1 / value : undefined;

  let summary: string;
  if (lang === "ko") {
    if (value < 1) summary = "R0 < 1이므로 유행이 지속되기 어려운 상태로 해석됩니다.";
    else if (value === 1) summary = "R0 = 1이므로 풍토병 균형 상태입니다.";
    else summary = `전파 가능성이 높으며, 집단면역 임계값은 대략 ${(hit! * 100).toFixed(1)}%입니다.`;
  } else {
    if (value < 1) summary = "With R0 < 1, the outbreak is unlikely to be sustained.";
    else if (value === 1) summary = "With R0 = 1, transmission is at endemic equilibrium.";
    else summary = `High transmission potential; the herd immunity threshold is approximately ${(hit! * 100).toFixed(1)}%.`;
  }

  const footnote = lang === "ko"
    ? "R0 < 1이면 유행이 지속되기 어렵고, R0 > 1이면 확산 가능성이 커집니다. HIT(집단면역 임계값)는 대략 1 - 1/R0로 계산할 수 있지만, 실제 필요 면역 수준은 집단 특성과 개입 효과에 따라 달라질 수 있습니다."
    : "When R0 < 1, an outbreak is unlikely to be sustained; when R0 > 1, spread is likely. The herd immunity threshold (HIT) can be estimated as 1 − 1/R0, though actual immunity requirements depend on population characteristics and intervention effectiveness.";

  return { summary, footnote, disclaimer: DISCLAIMER[lang], ...(hit !== undefined && { hit }) };
}

// ─── main export ─────────────────────────────────────────────────────────────

export function interpretResult(
  type: MetricType,
  values: MetricValues,
  lang: Lang = "en"
): InterpretationResult {
  switch (type) {
    case "RR":          return interpretRR(values, lang);
    case "OR":          return interpretOR(values, lang);
    case "ARR":         return interpretARR(values, lang);
    case "NNT":         return interpretNNT(values, lang);
    case "sensitivity": return interpretSensitivity(values, lang);
    case "specificity": return interpretSpecificity(values, lang);
    case "PPV":         return interpretPPV(values, lang);
    case "NPV":         return interpretNPV(values, lang);
    case "R0":          return interpretR0(values, lang);
  }
}

export default interpretResult;
