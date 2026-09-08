export interface SiblingApp {
    id: string;
    name: string;
    url: string;
  }
  
  export const SIBLING_APPS: SiblingApp[] = [
    { id: "epicalc", name: "EpiCalc", url: "https://epicalc.phtlab.org" },
    { id: "epistat", name: "EpiStat", url: "https://epistat.phtlab.org" },
    { id: "epiplus", name: "EpiPlus", url: "https://epiplus.phtlab.org" },
    { id: "epilog", name: "EpiLog", url: "https://epilog.phtlab.org" },
    { id: "epiaid", name: "EpiAid", url: "https://epiaid.phtlab.org" },
    { id: "vaxguard", name: "VaxGuard", url: "https://vaxguard.phtlab.org" },
  ];