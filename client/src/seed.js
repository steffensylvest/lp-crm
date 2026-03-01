import { uid, now } from './utils.js';

export const mkSeed = () => {
  const ts = now();
  const f = () => uid();

  // Pre-generate fund IDs we'll need for pipeline
  const bcp9 = f(), eqt10 = f(), brookV = f(), aresVI = f(), apolloXI = f(), cvcIX = f();

  return {
    gps: [
      {
        id: f(), name: "Blackstone", hq: "New York, USA", score: "A", owner: "Steven",
        contact: "Michael Chae", contactEmail: "mchae@blackstone.com", notes: "Top-tier relationship. Annual LP day in November. Consistent performer across cycles.",
        funds: [
          { id: bcp9, name: "Blackstone Capital Partners IX", series: "BCP", strategy: "Buyout", subStrategy: "Large-Cap Buyout", sectors: ["Industrials","Healthcare","Technology"], vintage: "2023", targetSize: "25000", raisedSize: "19500", finalSize: "", currency: "USD", status: "Fundraising", score: "A", notes: "Flagship buyout. Strong healthcare & industrials thesis.", invested: false, investmentAmount: "", investmentCurrency: "USD" },
          { id: f(), name: "Blackstone Capital Partners VIII", series: "BCP", strategy: "Buyout", subStrategy: "Large-Cap Buyout", sectors: ["Industrials","Technology"], vintage: "2019", targetSize: "20000", raisedSize: "26000", finalSize: "26000", currency: "USD", status: "Deployed", score: "A", notes: "Predecessor fund. Strong DPI tracking.", invested: true, investmentAmount: "50", investmentCurrency: "USD" },
          { id: f(), name: "Blackstone Real Estate Partners X", series: "BREP", strategy: "Real Estate", subStrategy: "Value Add", sectors: ["Logistics","Data Centres","Residential Housing"], vintage: "2022", targetSize: "30000", raisedSize: "30000", finalSize: "30500", currency: "USD", status: "Closed", score: "B", notes: "Closed at hard cap. Logistics and data centre focus.", invested: true, investmentAmount: "40", investmentCurrency: "USD" },
        ],
        meetings: [
          { id: f(), date: "2025-01-14", type: "In-Person", location: "New York", topic: "Annual LP Day", notes: "Strong deal flow. New healthcare thesis. BCP IX tracking well.", fundId: bcp9, loggedBy: "Me", loggedAt: ts },
          { id: f(), date: "2024-09-03", type: "Virtual", location: "Zoom", topic: "Q3 Portfolio Update", notes: "Solid performance. Exits ahead of schedule.", fundId: null, loggedBy: "Me", loggedAt: ts },
        ],
      },
      {
        id: f(), name: "KKR", hq: "New York, USA", score: "A", owner: "Andy",
        contact: "Johannes Huth", contactEmail: "jhuth@kkr.com", notes: "Strong European presence. Multi-strategy platform with deep sector expertise.",
        funds: [
          { id: f(), name: "KKR North America Fund XIV", series: "KKR NA Fund", strategy: "Buyout", subStrategy: "Large-Cap Buyout", sectors: ["Technology","Healthcare","Consumer"], vintage: "2024", targetSize: "20000", raisedSize: "12000", finalSize: "", currency: "USD", status: "Fundraising", score: "A", notes: "Flagship North America fund. Tech and healthcare focus.", invested: false, investmentAmount: "", investmentCurrency: "USD" },
          { id: f(), name: "KKR European Fund VI", series: "KKR European Fund", strategy: "Buyout", subStrategy: "Mid-Cap Buyout", sectors: ["Business Services","Industrials","Technology"], vintage: "2022", targetSize: "8000", raisedSize: "8000", finalSize: "8000", currency: "EUR", status: "Closed", score: "B", notes: "European mid-market focus. Good GP-led secondaries track record.", invested: true, investmentAmount: "30", investmentCurrency: "EUR" },
          { id: f(), name: "KKR Infrastructure V", series: "KKR Infrastructure", strategy: "Infrastructure", subStrategy: "Core Infrastructure", sectors: ["Energy Transition","Digital Infrastructure","Transport"], vintage: "2023", targetSize: "15000", raisedSize: "10000", finalSize: "", currency: "USD", status: "Fundraising", score: "A", notes: "Energy transition and digital infra. Strong pipeline.", invested: false, investmentAmount: "", investmentCurrency: "USD" },
        ],
        meetings: [
          { id: f(), date: "2024-11-20", type: "In-Person", location: "London", topic: "Infrastructure Strategy Roadshow", notes: "Energy transition pipeline impressive. Digital infra deals in Germany and Spain.", fundId: null, loggedBy: "Me", loggedAt: ts },
          { id: f(), date: "2024-07-10", type: "Virtual", location: "Teams", topic: "European Fund VI Update", notes: "3 exits in pipeline. Strong value creation across portfolio.", fundId: null, loggedBy: "Me", loggedAt: ts },
        ],
      },
      {
        id: f(), name: "EQT", hq: "Stockholm, Sweden", score: "A", owner: "Stephanie",
        contact: "Christian Sinding", contactEmail: "csinding@eqt.se", notes: "Nordic quality. Digitisation thesis across all strategies is compelling. Strong ESG credentials.",
        funds: [
          { id: eqt10, name: "EQT X", series: "EQT", strategy: "Buyout", subStrategy: "Large-Cap Buyout", sectors: ["Healthcare","Technology","Business Services"], vintage: "2024", targetSize: "22000", raisedSize: "16000", finalSize: "", currency: "EUR", status: "Fundraising", score: "A", notes: "Flagship fund. Digitisation + sustainability focus.", invested: false, investmentAmount: "", investmentCurrency: "EUR", owner: "Andy" },
          { id: f(), name: "EQT IX", series: "EQT", strategy: "Buyout", subStrategy: "Large-Cap Buyout", sectors: ["Healthcare","Technology"], vintage: "2021", targetSize: "15000", raisedSize: "15000", finalSize: "15800", currency: "EUR", status: "Monitoring", score: "A", notes: "Portfolio performing well. Key exits expected 2025-2026.", invested: true, investmentAmount: "45", investmentCurrency: "EUR" },
          { id: f(), name: "EQT Infrastructure VI", series: "EQT Infrastructure", strategy: "Infrastructure", subStrategy: "Core Infrastructure", sectors: ["Digital Infrastructure","Energy Transition"], vintage: "2022", targetSize: "21000", raisedSize: "21000", finalSize: "22000", currency: "EUR", status: "Closed", score: "B", notes: "Data centres and fibre networks. Closed above target.", invested: true, investmentAmount: "35", investmentCurrency: "EUR" },
        ],
        meetings: [
          { id: f(), date: "2025-01-22", type: "In-Person", location: "Stockholm", topic: "EQT X First Look", notes: "Strong AI-driven value creation examples. Healthcare digitisation pipeline impressive.", fundId: eqt10, loggedBy: "Me", loggedAt: ts },
          { id: f(), date: "2024-05-15", type: "In-Person", location: "Copenhagen", topic: "Annual Investor Day", notes: "Portfolio companies ahead of plan. ESG performance leading peer group.", fundId: null, loggedBy: "Me", loggedAt: ts },
        ],
      },
      {
        id: f(), name: "Brookfield Asset Management", hq: "Toronto, Canada", score: "A", owner: "Vick",
        contact: "Connor Teskey", contactEmail: "cteskey@brookfield.com", notes: "Best-in-class real assets platform. Energy transition is a major focus. Growing relationship.",
        funds: [
          { id: brookV, name: "Brookfield Infrastructure Fund V", series: "BIF", strategy: "Infrastructure", subStrategy: "Core Infrastructure", sectors: ["Energy Transition","Transport","Digital Infrastructure"], vintage: "2024", targetSize: "25000", raisedSize: "15000", finalSize: "", currency: "USD", status: "Fundraising", score: "A", notes: "Energy transition and transport focus. Global mandate.", invested: false, investmentAmount: "", investmentCurrency: "USD", owner: "Steven" },
          { id: f(), name: "Brookfield Infrastructure Fund IV", series: "BIF", strategy: "Infrastructure", subStrategy: "Core Infrastructure", sectors: ["Energy Transition","Transport"], vintage: "2020", targetSize: "20000", raisedSize: "20000", finalSize: "20000", currency: "USD", status: "Monitoring", score: "A", notes: "Strong current yields. Distribution growth on track.", invested: true, investmentAmount: "60", investmentCurrency: "USD" },
          { id: f(), name: "Brookfield Renewable Partners IV", series: "BRP", strategy: "Real Assets", subStrategy: "Core", sectors: ["Solar","Wind","Energy Transition"], vintage: "2023", targetSize: "10000", raisedSize: "7000", finalSize: "", currency: "USD", status: "Fundraising", score: "A", notes: "Pure-play renewables. Strong contracted cash flows.", invested: false, investmentAmount: "", investmentCurrency: "USD" },
        ],
        meetings: [
          { id: f(), date: "2024-12-03", type: "In-Person", location: "Toronto", topic: "BIF V Due Diligence", notes: "Detailed review of energy transition pipeline. Offshore wind and solar assets compelling.", fundId: brookV, loggedBy: "Me", loggedAt: ts },
          { id: f(), date: "2024-08-19", type: "Virtual", location: "Zoom", topic: "BIF IV Q2 Update", notes: "Cash yields ahead of plan. Two new acquisitions in European transport.", fundId: null, loggedBy: "Me", loggedAt: ts },
        ],
      },
      {
        id: f(), name: "Ares Management", hq: "Los Angeles, USA", score: "A", owner: "Steven",
        contact: "Kipp deVeer", contactEmail: "kdeveer@aresmgmt.com", notes: "Dominant credit platform. Differentiated origination via 600+ portfolio companies.",
        funds: [
          { id: aresVI, name: "Ares Capital Europe VI", series: "ACE", strategy: "Private Credit", subStrategy: "Senior Secured", sectors: ["Business Services","Healthcare","Technology"], vintage: "2024", targetSize: "15000", raisedSize: "9000", finalSize: "", currency: "EUR", status: "Fundraising", score: "A", notes: "European direct lending. Strong origination pipeline.", invested: false, investmentAmount: "", investmentCurrency: "EUR" },
          { id: f(), name: "Ares Capital Europe V", series: "ACE", strategy: "Private Credit", subStrategy: "Senior Secured", sectors: ["Business Services","Healthcare"], vintage: "2021", targetSize: "11000", raisedSize: "11000", finalSize: "11500", currency: "EUR", status: "Deployed", score: "A", notes: "Strong realised returns. Low loss rate.", invested: true, investmentAmount: "40", investmentCurrency: "EUR" },
          { id: f(), name: "Ares Real Estate Debt Fund IV", series: "AREDF", strategy: "Real Estate", subStrategy: "Core", sectors: ["Logistics","Residential Housing"], vintage: "2022", targetSize: "5000", raisedSize: "5000", finalSize: "5200", currency: "USD", status: "Closed", score: "B", notes: "Real estate debt strategy. Senior secured loans.", invested: false, investmentAmount: "", investmentCurrency: "USD" },
        ],
        meetings: [
          { id: f(), date: "2025-01-08", type: "In-Person", location: "London", topic: "ACE VI Roadshow", notes: "Origination volumes strong. AI and healthcare sectors driving demand.", fundId: aresVI, loggedBy: "Me", loggedAt: ts },
          { id: f(), date: "2024-10-14", type: "Virtual", location: "Zoom", topic: "Ares Platform Update", notes: "Cross-platform synergies. Real estate debt growing fast.", fundId: null, loggedBy: "Me", loggedAt: ts },
        ],
      },
      {
        id: f(), name: "Apollo Global Management", hq: "New York, USA", score: "B", owner: "Andy",
        contact: "James Zelter", contactEmail: "jzelter@apollo.com", notes: "Credit expertise is differentiated. Yield-oriented strategies increasingly relevant.",
        funds: [
          { id: apolloXI, name: "Apollo Investment Fund XI", series: "AIF", strategy: "Private Credit", subStrategy: "Unitranche", sectors: ["Business Services","Financial Services","Healthcare"], vintage: "2024", targetSize: "15000", raisedSize: "8500", finalSize: "", currency: "USD", status: "Fundraising", score: "B", notes: "Direct lending focus. Good risk-adjusted returns.", invested: false, investmentAmount: "", investmentCurrency: "USD" },
          { id: f(), name: "Apollo Investment Fund X", series: "AIF", strategy: "Private Credit", subStrategy: "Senior Secured", sectors: ["Business Services","Financial Services"], vintage: "2021", targetSize: "12000", raisedSize: "12000", finalSize: "12500", currency: "USD", status: "Deployed", score: "B", notes: "Predecessor fund. Clean track record.", invested: true, investmentAmount: "25", investmentCurrency: "USD" },
        ],
        meetings: [
          { id: f(), date: "2024-10-20", type: "In-Person", location: "London", topic: "Strategy Roadshow", notes: "European direct lending opportunities highlighted. Originated EUR 8bn in 2024.", fundId: apolloXI, loggedBy: "Me", loggedAt: ts },
        ],
      },
      {
        id: f(), name: "CVC Capital Partners", hq: "London, UK", score: "B", owner: "Stephanie",
        contact: "Rob Lucas", contactEmail: "rlucas@cvc.com", notes: "Leading European buyout firm. Strong consumer and financial services track record.",
        funds: [
          { id: cvcIX, name: "CVC Capital Partners IX", series: "CVC", strategy: "Buyout", subStrategy: "Large-Cap Buyout", sectors: ["Consumer","Financial Services","Business Services"], vintage: "2024", targetSize: "26000", raisedSize: "21000", finalSize: "", currency: "EUR", status: "Fundraising", score: "B", notes: "Flagship European buyout. Recently listed.", invested: false, investmentAmount: "", investmentCurrency: "EUR" },
          { id: f(), name: "CVC Capital Partners VIII", series: "CVC", strategy: "Buyout", subStrategy: "Large-Cap Buyout", sectors: ["Consumer","Healthcare"], vintage: "2020", targetSize: "21000", raisedSize: "21000", finalSize: "21000", currency: "EUR", status: "Monitoring", score: "B", notes: "Portfolio performing in line with plan.", invested: true, investmentAmount: "30", investmentCurrency: "EUR" },
          { id: f(), name: "CVC Credit Partners IV", series: "CVC Credit", strategy: "Private Credit", subStrategy: "Mezzanine", sectors: ["Consumer","Business Services"], vintage: "2022", targetSize: "4000", raisedSize: "4000", finalSize: "4200", currency: "EUR", status: "Closed", score: "C", notes: "Mezzanine and subordinated debt strategy.", invested: false, investmentAmount: "", investmentCurrency: "EUR" },
        ],
        meetings: [
          { id: f(), date: "2024-11-07", type: "In-Person", location: "London", topic: "CVC IX Investor Meeting", notes: "Strong track record presented. Q3 portfolio update positive.", fundId: cvcIX, loggedBy: "Me", loggedAt: ts },
        ],
      },
      {
        id: f(), name: "Advent International", hq: "Boston, USA", score: "B", owner: "Vick",
        contact: "David Mussafer", contactEmail: "dmussafer@adventinternational.com", notes: "Strong global buyout with EM exposure. Technology sector expertise.",
        funds: [
          { id: f(), name: "Advent International GPE XI", series: "GPE", strategy: "Buyout", subStrategy: "Mid-Cap Buyout", sectors: ["Technology","Financial Services","Healthcare"], vintage: "2024", targetSize: "25000", raisedSize: "14000", finalSize: "", currency: "USD", status: "Fundraising", score: "B", notes: "Global platform. Good LatAm exposure.", invested: false, investmentAmount: "", investmentCurrency: "USD" },
          { id: f(), name: "Advent International GPE X", series: "GPE", strategy: "Buyout", subStrategy: "Mid-Cap Buyout", sectors: ["Technology","Financial Services"], vintage: "2019", targetSize: "17500", raisedSize: "17500", finalSize: "17500", currency: "USD", status: "Exiting", score: "B", notes: "In harvesting mode. Several exits expected 2025.", invested: true, investmentAmount: "20", investmentCurrency: "USD" },
        ],
        meetings: [
          { id: f(), date: "2024-09-17", type: "In-Person", location: "Boston", topic: "GPE XI First Look", notes: "Impressed by FinTech deal flow. LATAM opportunities compelling.", fundId: null, loggedBy: "Me", loggedAt: ts },
        ],
      },
      {
        id: f(), name: "Permira", hq: "London, UK", score: "B", owner: "Steven",
        contact: "Tom Lister", contactEmail: "tlister@permira.com", notes: "Tech and consumer focus. Strong European network. IX fundraise in market.",
        funds: [
          { id: f(), name: "Permira IX", series: "Permira", strategy: "Buyout", subStrategy: "Large-Cap Buyout", sectors: ["Technology","Consumer","Healthcare"], vintage: "2024", targetSize: "18000", raisedSize: "11000", finalSize: "", currency: "EUR", status: "Fundraising", score: "B", notes: "Heavy technology tilt. Software platform consolidation thesis.", invested: false, investmentAmount: "", investmentCurrency: "EUR" },
          { id: f(), name: "Permira VIII", series: "Permira", strategy: "Buyout", subStrategy: "Large-Cap Buyout", sectors: ["Technology","Consumer"], vintage: "2020", targetSize: "16700", raisedSize: "16700", finalSize: "16700", currency: "EUR", status: "Monitoring", score: "B", notes: "COVID vintage. Tech deals outperforming.", invested: true, investmentAmount: "25", investmentCurrency: "EUR" },
        ],
        meetings: [
          { id: f(), date: "2024-12-11", type: "In-Person", location: "London", topic: "Permira IX Roadshow", notes: "Software buyout thesis resonates. Automation driving margin expansion.", fundId: null, loggedBy: "Me", loggedAt: ts },
        ],
      },
      {
        id: f(), name: "Warburg Pincus", hq: "New York, USA", score: "B", owner: "Andy",
        contact: "Timothy Geithner", contactEmail: "tgeithner@warburgpincus.com", notes: "Growth equity specialist. Strong EM exposure and healthcare vertical.",
        funds: [
          { id: f(), name: "Warburg Pincus Global Growth 15", series: "WPGG", strategy: "Growth Equity", subStrategy: "Minority Growth", sectors: ["Technology","Healthcare","Financial Services"], vintage: "2024", targetSize: "17000", raisedSize: "9000", finalSize: "", currency: "USD", status: "Fundraising", score: "B", notes: "Global growth equity. AI-driven companies in focus.", invested: false, investmentAmount: "", investmentCurrency: "USD" },
          { id: f(), name: "Warburg Pincus Global Growth 14", series: "WPGG", strategy: "Growth Equity", subStrategy: "Minority Growth", sectors: ["Technology","Healthcare"], vintage: "2021", targetSize: "16000", raisedSize: "16000", finalSize: "16000", currency: "USD", status: "Monitoring", score: "C", notes: "Tech multiples compressed. Healthcare offsetting.", invested: false, investmentAmount: "", investmentCurrency: "USD" },
        ],
        meetings: [
          { id: f(), date: "2024-08-22", type: "Virtual", location: "Zoom", topic: "WP Global Growth 15 Intro", notes: "AI thesis is compelling. Question marks on EM execution.", fundId: null, loggedBy: "Me", loggedAt: ts },
        ],
      },
      {
        id: f(), name: "HgCapital", hq: "London, UK", score: "B", owner: "Stephanie",
        contact: "Nic Humphries", contactEmail: "nhumphries@hgcapital.com", notes: "Specialist software and tech-enabled services. Highly repeatable model. Premium priced.",
        funds: [
          { id: f(), name: "Hg Saturn 4", series: "Hg Saturn", strategy: "Buyout", subStrategy: "Large-Cap Buyout", sectors: ["Technology","Business Services"], vintage: "2024", targetSize: "12000", raisedSize: "8000", finalSize: "", currency: "EUR", status: "Fundraising", score: "B", notes: "Large-cap software buyout. Strong DACH and Nordic pipeline.", invested: false, investmentAmount: "", investmentCurrency: "EUR" },
          { id: f(), name: "Hg Genesis 10", series: "Hg Genesis", strategy: "Buyout", subStrategy: "Mid-Cap Buyout", sectors: ["Technology","Business Services"], vintage: "2022", targetSize: "6700", raisedSize: "6700", finalSize: "6700", currency: "EUR", status: "Closed", score: "B", notes: "Mid-market tech buyout. Strong returns on Genesis 9.", invested: true, investmentAmount: "20", investmentCurrency: "EUR" },
        ],
        meetings: [
          { id: f(), date: "2024-10-30", type: "In-Person", location: "London", topic: "Saturn 4 Deep Dive", notes: "Highly differentiated model. All software, all profitable. Execution risk is concentration.", fundId: null, loggedBy: "Me", loggedAt: ts },
        ],
      },
      {
        id: f(), name: "Nordic Capital", hq: "Stockholm, Sweden", score: "B", owner: "Vick",
        contact: "Kristoffer Melinder", contactEmail: "kmelinder@nordiccapital.com", notes: "Healthcare and tech focus in Nordics and Europe. Strong operational capabilities.",
        funds: [
          { id: f(), name: "Nordic Capital Fund XII", series: "Nordic Capital", strategy: "Buyout", subStrategy: "Mid-Cap Buyout", sectors: ["Healthcare","Technology","Financial Services"], vintage: "2022", targetSize: "9000", raisedSize: "9000", finalSize: "9000", currency: "EUR", status: "Closed", score: "B", notes: "Healthcare and fintech focus. Closed at hard cap.", invested: true, investmentAmount: "15", investmentCurrency: "EUR" },
          { id: f(), name: "Nordic Capital Credit Opportunities IV", series: "NC Credit", strategy: "Private Credit", subStrategy: "Senior Secured", sectors: ["Healthcare","Technology"], vintage: "2023", targetSize: "2000", raisedSize: "1500", finalSize: "", currency: "EUR", status: "Fundraising", score: "C", notes: "Credit companion to equity strategy.", invested: false, investmentAmount: "", investmentCurrency: "EUR" },
        ],
        meetings: [
          { id: f(), date: "2024-06-05", type: "In-Person", location: "Stockholm", topic: "NC XII Portfolio Review", notes: "Healthcare portfolio strong. HealthTech exits tracking ahead of plan.", fundId: null, loggedBy: "Me", loggedAt: ts },
        ],
      },
      {
        id: f(), name: "Carlyle Group", hq: "Washington DC, USA", score: "B", owner: "Steven",
        contact: "Harvey Schwartz", contactEmail: "hschwartz@carlyle.com", notes: "Large diversified platform. Global reach is a key differentiator. New CEO still embedding.",
        funds: [
          { id: f(), name: "Carlyle Partners VIII", series: "Carlyle Partners", strategy: "Buyout", subStrategy: "Large-Cap Buyout", sectors: ["Industrials","Aerospace","Healthcare"], vintage: "2025", targetSize: "22000", raisedSize: "5000", finalSize: "", currency: "USD", status: "Pre-Marketing", score: "B", notes: "US buyout flagship. Early days — monitoring closely.", invested: false, investmentAmount: "", investmentCurrency: "USD" },
          { id: f(), name: "Carlyle Europe Partners VI", series: "CEP", strategy: "Buyout", subStrategy: "Mid-Cap Buyout", sectors: ["Business Services","Industrials"], vintage: "2022", targetSize: "6500", raisedSize: "6500", finalSize: "6800", currency: "EUR", status: "Closed", score: "C", notes: "European mid-market. Solid not spectacular.", invested: false, investmentAmount: "", investmentCurrency: "EUR" },
        ],
        meetings: [
          { id: f(), date: "2024-07-25", type: "In-Person", location: "Washington DC", topic: "Carlyle Platform Overview", notes: "New CEO presented 5-year strategy. Simplification of platform underway.", fundId: null, loggedBy: "Me", loggedAt: ts },
        ],
      },
      {
        id: f(), name: "General Atlantic", hq: "New York, USA", score: "B", owner: "Andy",
        contact: "Gabriel Caillaux", contactEmail: "gcaillaux@generalatlantic.com", notes: "Growth equity at scale. Good technology and healthcare network. EM is differentiator.",
        funds: [
          { id: f(), name: "GA Growth Fund XI", series: "GA Growth", strategy: "Growth Equity", subStrategy: "Minority Growth", sectors: ["Technology","Healthcare","Consumer"], vintage: "2024", targetSize: "10000", raisedSize: "6000", finalSize: "", currency: "USD", status: "Fundraising", score: "B", notes: "Global growth equity. AI and climate tech emerging themes.", invested: false, investmentAmount: "", investmentCurrency: "USD" },
          { id: f(), name: "GA Growth Fund X", series: "GA Growth", strategy: "Growth Equity", subStrategy: "Minority Growth", sectors: ["Technology","Consumer"], vintage: "2021", targetSize: "9000", raisedSize: "9000", finalSize: "9000", currency: "USD", status: "Monitoring", score: "B", notes: "COVID deals being worked through. Tech multiples normalising.", invested: false, investmentAmount: "", investmentCurrency: "USD" },
        ],
        meetings: [
          { id: f(), date: "2024-11-12", type: "Virtual", location: "Zoom", topic: "GA Growth XI Intro Meeting", notes: "Climate tech and AI themes well-articulated. Execution track record solid.", fundId: null, loggedBy: "Me", loggedAt: ts },
        ],
      },
      {
        id: f(), name: "Blue Owl Capital", hq: "New York, USA", score: "B", owner: "Stephanie",
        contact: "Craig Packer", contactEmail: "cpacker@blueowl.com", notes: "Fast-growing direct lending platform. No-loss track record compelling. Premium fees.",
        funds: [
          { id: f(), name: "Blue Owl Technology Finance III", series: "BOTF", strategy: "Private Credit", subStrategy: "Senior Secured", sectors: ["Technology","Business Services"], vintage: "2024", targetSize: "8000", raisedSize: "4500", finalSize: "", currency: "USD", status: "Fundraising", score: "B", notes: "Tech-focused direct lending. Strong origination from Oak Street relationships.", invested: false, investmentAmount: "", investmentCurrency: "USD" },
          { id: f(), name: "Blue Owl Real Estate Finance II", series: "BORE", strategy: "Real Estate", subStrategy: "Core", sectors: ["Logistics","Data Centres"], vintage: "2022", targetSize: "4000", raisedSize: "4000", finalSize: "4200", currency: "USD", status: "Closed", score: "C", notes: "Net lease real estate finance. Stable income.", invested: false, investmentAmount: "", investmentCurrency: "USD" },
        ],
        meetings: [
          { id: f(), date: "2024-09-25", type: "In-Person", location: "New York", topic: "Blue Owl Direct Lending Update", notes: "No realized losses is impressive. Pricing coming in on tighter spreads — watching.", fundId: null, loggedBy: "Me", loggedAt: ts },
        ],
      },
      {
        id: f(), name: "Macquarie Asset Management", hq: "Sydney, Australia", score: "C", owner: "Vick",
        contact: "Ben Way", contactEmail: "bway@macquarie.com", notes: "Infrastructure specialist. Good Australian and Asian pipeline. Fees are high.",
        funds: [
          { id: f(), name: "Macquarie Infrastructure Partners VI", series: "MIP", strategy: "Infrastructure", subStrategy: "Core Infrastructure", sectors: ["Transport","Energy Transition","Digital Infrastructure"], vintage: "2024", targetSize: "6000", raisedSize: "3000", finalSize: "", currency: "USD", status: "Fundraising", score: "C", notes: "Diversified infrastructure. Emerging markets exposure.", invested: false, investmentAmount: "", investmentCurrency: "USD" },
          { id: f(), name: "Macquarie Green Investment Group III", series: "MGIG", strategy: "Real Assets", subStrategy: "Core", sectors: ["Solar","Wind","Energy Transition"], vintage: "2022", targetSize: "3500", raisedSize: "3500", finalSize: "3500", currency: "GBP", status: "Closed", score: "C", notes: "Renewables development. Higher risk profile.", invested: false, investmentAmount: "", investmentCurrency: "GBP" },
        ],
        meetings: [
          { id: f(), date: "2024-04-18", type: "Virtual", location: "Zoom", topic: "MIP VI Presentation", notes: "APAC pipeline highlighted. Fee structures remain a sticking point.", fundId: null, loggedBy: "Me", loggedAt: ts },
        ],
      },
      {
        id: f(), name: "PAI Partners", hq: "Paris, France", score: "C", owner: "Steven",
        contact: "Frédéric Stévenin", contactEmail: "fstevenin@paipartners.com", notes: "Consumer and healthcare focus in Europe. Mid-market with some mega exposure.",
        funds: [
          { id: f(), name: "PAI Partners IX", series: "PAI", strategy: "Buyout", subStrategy: "Large-Cap Buyout", sectors: ["Consumer","Healthcare","Industrials"], vintage: "2024", targetSize: "8000", raisedSize: "3500", finalSize: "", currency: "EUR", status: "Fundraising", score: "C", notes: "Consumer and healthcare focus. Post-Bridgepoint merger improving platform.", invested: false, investmentAmount: "", investmentCurrency: "EUR" },
        ],
        meetings: [
          { id: f(), date: "2024-06-20", type: "In-Person", location: "Paris", topic: "PAI IX Roadshow", notes: "Consumer portfolio underperforming post-COVID. Healthcare more resilient.", fundId: null, loggedBy: "Me", loggedAt: ts },
        ],
      },
      {
        id: f(), name: "Bridgepoint", hq: "London, UK", score: "C", owner: "Andy",
        contact: "William Jackson", contactEmail: "wjackson@bridgepoint.eu", notes: "European mid-market specialist. Good track record but fees are aggressive.",
        funds: [
          { id: f(), name: "Bridgepoint Europe VII", series: "BEP", strategy: "Buyout", subStrategy: "Mid-Cap Buyout", sectors: ["Business Services","Healthcare","Technology"], vintage: "2022", targetSize: "7500", raisedSize: "7500", finalSize: "7500", currency: "EUR", status: "Closed", score: "C", notes: "European mid-market. Good healthcare deals.", invested: false, investmentAmount: "", investmentCurrency: "EUR" },
          { id: f(), name: "Bridgepoint Credit IV", series: "BPC", strategy: "Private Credit", subStrategy: "Senior Secured", sectors: ["Business Services","Consumer"], vintage: "2023", targetSize: "2500", raisedSize: "1800", finalSize: "", currency: "EUR", status: "Fundraising", score: "D", notes: "Credit arm growing. Lacks scale vs larger peers.", invested: false, investmentAmount: "", investmentCurrency: "EUR" },
        ],
        meetings: [
          { id: f(), date: "2024-03-14", type: "In-Person", location: "London", topic: "BEP VII Final Close Update", notes: "Closed above target. Deployment has been slower than expected in current environment.", fundId: null, loggedBy: "Me", loggedAt: ts },
        ],
      },
      {
        id: f(), name: "Tiger Global", hq: "New York, USA", score: "D", owner: "Stephanie",
        contact: "Chase Coleman", contactEmail: "ccoleman@tigerglobal.com", notes: "Significant losses in 2022 vintage. Rebuilding credibility. Watching from distance.",
        funds: [
          { id: f(), name: "Tiger Global Private Investment XV", series: "TGP", strategy: "Venture Capital", subStrategy: "Late Stage", sectors: ["Technology","Consumer"], vintage: "2022", targetSize: "6000", raisedSize: "6000", finalSize: "6000", currency: "USD", status: "Monitoring", score: "D", notes: "Deeply marked down. Liquidity timeline uncertain.", invested: false, investmentAmount: "", investmentCurrency: "USD" },
        ],
        meetings: [
          { id: f(), date: "2023-11-30", type: "Virtual", location: "Zoom", topic: "Portfolio Review", notes: "Significant markdowns disclosed. Team turnover ongoing. On watchlist.", fundId: null, loggedBy: "Me", loggedAt: ts },
        ],
      },
      {
        id: f(), name: "Vista Equity Partners", hq: "Austin, USA", score: "E", owner: "Vick",
        contact: "Robert Smith", contactEmail: "rsmith@vistaequitypartners.com", notes: "Compliance and governance concerns following 2023 investigation. On hold pending resolution.",
        funds: [
          { id: f(), name: "Vista Equity Partners Fund IX", series: "VEP", strategy: "Buyout", subStrategy: "Mid-Cap Buyout", sectors: ["Technology"], vintage: "2022", targetSize: "20000", raisedSize: "20000", finalSize: "20000", currency: "USD", status: "Deployed", score: "E", notes: "Strong software returns but governance concerns override. Not re-upping.", invested: false, investmentAmount: "", investmentCurrency: "USD" },
        ],
        meetings: [
          { id: f(), date: "2023-09-05", type: "Virtual", location: "Zoom", topic: "Annual Review", notes: "Discussed governance concerns directly. Unsatisfactory response. Placing on exclusion list.", fundId: null, loggedBy: "Me", loggedAt: ts },
        ],
      },
    ],
    pipeline: [
      { id: f(), gpName: "Blackstone", stage: "diligence",   addedAt: ts, pipelineNotes: "BCP IX — strong conviction. IC submission Q1 2025.", fundId: bcp9 },
      { id: f(), gpName: "EQT",        stage: "ic-review",   addedAt: ts, pipelineNotes: "EQT X — presenting to IC next month.", fundId: eqt10 },
      { id: f(), gpName: "Brookfield Asset Management", stage: "first-look", addedAt: ts, pipelineNotes: "BIF V — initial DD underway.", fundId: brookV },
      { id: f(), gpName: "Ares Management", stage: "diligence", addedAt: ts, pipelineNotes: "ACE VI — advanced diligence. Reference calls in progress.", fundId: aresVI },
      { id: f(), gpName: "Apollo Global Management", stage: "first-look", addedAt: ts, pipelineNotes: "AIF XI — reviewing terms sheet.", fundId: apolloXI },
      { id: f(), gpName: "CVC Capital Partners", stage: "watching", addedAt: ts, pipelineNotes: "CVC IX — monitoring progress. Not yet committed.", fundId: cvcIX },
    ],
  };
};
