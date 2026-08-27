import { ref } from "vue";

export const language = ref("English");

// Page copy is kept in one place so the selector updates every translated view.
const messages = {
  English: {
    home: "Home",
    services: "Services",
    store: "Safety store",
    hub: "Safety hub",
    login: "Log in",
    register: "Create account",
    tagline: "Safety starts with being connected.",
    hero: "Your safety. Your people. Your choice.",
    heroLead:
      "Protection, emergency assistance, and trusted support, all in one place.",
    help: "Get help now",
    shop: "Shop safety products",
    mapTitle: "See your surroundings.",
    mapText:
      "Track your position and find nearby police, ambulance and trusted SafeHer help.",
    welcome: "Your safety hub.",
    hubLead: "Stay connected, prepared and supported wherever you go.",
    oneTap: "One-Tap Alert",
    emergencyContacts: "Emergency Contacts",
    liveRoute: "Live Route",
    checkins: "Check-ins Completed",
    liveLocation: "Live Location",
    locate: "Locate me",
    contactPrompt: "Add someone you trust below.",
    addContact: "Add contact",
    saveContact: "Save contact",
    shareRoute: "Share route",
    checkinTimer: "Check-in Timer",
    storeTitle: "Safety products for every day.",
    storeLead: "Practical tools for prevention, protection and peace of mind.",
    safetyAccessory: "Safety accessory",
    add: "Add",
    guide: "Safety Guide",
    guideLead:
      "Practical steps, self-defence basics and simple instructions for your SafeHer tools.",
    staySafe: "Stay safe in the moment",
    staySafeText:
      "Trust your instincts, move toward people and light, and call for help before a situation escalates.",
    selfDefence: "Self-defence basics",
    selfDefenceText:
      "Create distance, use your voice, protect your head and leave as soon as you have a safe opening.",
    itemGuide: "Using your safety items",
    itemGuideText:
      "Test your panic button, keep your spray accessible and learn each tool before you need it.",
    stepOne: "1. Notice",
    stepOneText:
      "Pay attention to changes around you and trust the feeling that tells you something is wrong.",
    stepTwo: "2. Create distance",
    stepTwoText: "Move away, keep an exit visible and avoid being cornered.",
    stepThree: "3. Alert your people",
    stepThreeText:
      "Use SOS or share your live route with your emergency contacts.",
    servicesTitle: "Safety Guide",
  },
  isiZulu: {
    home: "Ikhaya",
    services: "Izinsizakalo",
    store: "Isitolo sokuphepha",
    hub: "Isikhungo sokuphepha",
    login: "Ngena",
    register: "Dala i-akhawunti",
    tagline: "Ukuphepha kuqala ngokuxhumana.",
    hero: "Ukuphepha kwakho. Abantu bakho. Ukukhetha kwakho.",
    heroLead: "Ukuvikelwa, usizo oluphuthumayo nokwesekwa endaweni eyodwa.",
    help: "Thola usizo manje",
    shop: "Thenga imikhiqizo yokuphepha",
    mapTitle: "Bona okukuzungezile.",
    mapText:
      "Landela indawo yakho uthole amaphoyisa, i-ambulensi nosizo lwe-SafeHer.",
    welcome: "Isikhungo sakho sokuphepha.",
    hubLead: "Hlala uxhumekile, ulungele futhi usekelwe noma yikuphi.",
    oneTap: "Isaziso ngokuchofoza okukodwa",
    emergencyContacts: "Oxhumana nabo besimo esiphuthumayo",
    liveRoute: "Umzila obukhoma",
    checkins: "Ukuhlola okuphelile",
    liveLocation: "Indawo bukhoma",
    locate: "Thola indawo yami",
    contactPrompt: "Engeza umuntu omethembayo ngezansi.",
    addContact: "Engeza oxhumana naye",
    saveContact: "Gcina oxhumana naye",
    shareRoute: "Yabelana ngomzila",
    checkinTimer: "Isikhathi sokuhlola",
    storeTitle: "Imikhiqizo yokuphepha yansuku zonke.",
    storeLead: "Amathuluzi okuvikela nokuthula kwengqondo.",
    safetyAccessory: "Izesekeli zokuphepha",
    add: "Engeza",
    guide: "Umhlahlandlela wokuphepha",
    guideLead:
      "Izinyathelo ezisebenzayo, izisekelo zokuzivikela nemiyalelo yamathuluzi akho e-SafeHer.",
    staySafe: "Hlala uphephile okwamanje",
    staySafeText:
      "Themba umuzwa wakho, uye kubantu nokukhanya, bese ucela usizo ngaphambi kokuba isimo sibe sibi.",
    selfDefence: "Izisekelo zokuzivikela",
    selfDefenceText:
      "Yakha ibanga, sebenzisa izwi lakho, vikela ikhanda bese uyahamba uma ithuba liphephile.",
    itemGuide: "Ukusebenzisa amathuluzi akho",
    itemGuideText:
      "Hlola inkinobho ye-panic, gcina i-spray iseduze futhi funda ithuluzi ngalinye kusenesikhathi.",
    stepOne: "1. Qaphela",
    stepOneText:
      "Qaphela izinguquko ezikuzungezile futhi wethembe umuzwa okutshela ukuthi kukhona okungalungile.",
    stepTwo: "2. Yakha ibanga",
    stepTwoText:
      "Suka, gcina indlela yokuphuma ibonakala futhi ungavaleleki ekhoneni.",
    stepThree: "3. Yazisa abantu bakho",
    stepThreeText:
      "Sebenzisa i-SOS noma yabelana ngomzila wakho obukhoma nabantu bakho.",
    servicesTitle: "Umhlahlandlela wokuphepha",
  },
  Afrikaans: {
    home: "Tuis",
    services: "Dienste",
    store: "Veiligheidswinkel",
    hub: "Veiligheidsentrum",
    login: "Teken in",
    register: "Skep rekening",
    tagline: "Veiligheid begin deur verbind te wees.",
    hero: "Jou veiligheid. Jou mense. Jou keuse.",
    heroLead: "Beskerming, noodhulp en betroubare ondersteuning op een plek.",
    help: "Kry nou hulp",
    shop: "Koop veiligheidsprodukte",
    mapTitle: "Sien jou omgewing.",
    mapText: "Volg jou ligging en vind polisie, ambulans en SafeHer-hulp.",
    welcome: "Jou veiligheidsentrum.",
    hubLead: "Bly verbind, voorbereid en ondersteun waar jy ook al gaan.",
    oneTap: "Een-klik waarskuwing",
    emergencyContacts: "Noodkontakte",
    liveRoute: "Regstreekse roete",
    checkins: "Inboekings voltooi",
    liveLocation: "Regstreekse ligging",
    locate: "Vind my ligging",
    contactPrompt: "Voeg iemand wat jy vertrou hieronder by.",
    addContact: "Voeg kontak by",
    saveContact: "Stoor kontak",
    shareRoute: "Deel roete",
    checkinTimer: "Inboektydhouer",
    storeTitle: "Veiligheidsprodukte vir elke dag.",
    storeLead: "Praktiese gereedskap vir beskerming en gemoedsrus.",
    safetyAccessory: "Veiligheidsbykomstigheid",
    add: "Voeg by",
    guide: "Veiligheidsgids",
    guideLead:
      "Praktiese stappe, selfverdediging-basiese beginsels en instruksies vir jou SafeHer-gereedskap.",
    staySafe: "Bly veilig in die oomblik",
    staySafeText:
      "Vertrou jou instinkte, beweeg na mense en ligte, en kry hulp voordat die situasie eskaleer.",
    selfDefence: "Selfverdediging-basiese beginsels",
    selfDefenceText:
      "Skep afstand, gebruik jou stem, beskerm jou kop en vertrek wanneer daar 'n veilige opening is.",
    itemGuide: "Gebruik jou veiligheidsitems",
    itemGuideText:
      "Toets jou paniekknoppie, hou jou sproei naby en leer elke item ken voordat jy dit nodig het.",
    stepOne: "1. Let op",
    stepOneText:
      "Let op veranderinge rondom jou en vertrou die gevoel dat iets verkeerd is.",
    stepTwo: "2. Skep afstand",
    stepTwoText:
      "Beweeg weg, hou 'n uitgang sigbaar en vermy dat jy vasgekeer word.",
    stepThree: "3. Waarsku jou mense",
    stepThreeText:
      "Gebruik SOS of deel jou regstreekse roete met jou noodkontakte.",
    servicesTitle: "Veiligheidsgids",
  },
  isiXhosa: {
    home: "Ekhaya",
    services: "Iinkonzo",
    store: "Ivenkile yokhuseleko",
    hub: "Iziko lokhuseleko",
    login: "Ngena",
    register: "Yenza iakhawunti",
    tagline: "Ukhuseleko luqala ngokunxibelelana.",
    hero: "Ukhuseleko lwakho. Abantu bakho. Ukhetho lwakho.",
    heroLead:
      "Ukhuseleko, uncedo olungxamisekileyo nenkxaso ethembekileyo kwindawo enye.",
    help: "Fumana uncedo ngoku",
    shop: "Thenga iimveliso zokhuseleko",
    mapTitle: "Bona okukungqongileyo.",
    mapText:
      "Landela indawo yakho ufumane amapolisa, i-ambulensi noncedo lwe-SafeHer.",
    welcome: "Iziko lakho lokhuseleko.",
    hubLead: "Hlala unxibelelene, ulungele kwaye uxhaswe naphi na.",
    oneTap: "Isilumkiso ngokucofa kanye",
    emergencyContacts: "Abafowunelwa abangxamisekileyo",
    liveRoute: "Indlela ephilayo",
    checkins: "Ukujonga okugqityiweyo",
    liveLocation: "Indawo ephilayo",
    locate: "Fumana indawo yam",
    contactPrompt: "Yongeza umntu omthembayo ngezantsi.",
    addContact: "Yongeza umfowunelwa",
    saveContact: "Gcina umfowunelwa",
    shareRoute: "Yabelana ngendlela",
    checkinTimer: "Ixesha lokujonga",
    storeTitle: "Iimveliso zokhuseleko zemihla ngemihla.",
    storeLead: "Izixhobo ezisebenzayo zokhuseleko noxolo lwengqondo.",
    safetyAccessory: "Isixhobo sokhuseleko",
    add: "Yongeza",
    guide: "Isikhokelo sokhuseleko",
    guideLead:
      "Amanyathelo asebenzayo, iziseko zokuzikhusela nemiyalelo yezixhobo zakho ze-SafeHer.",
    staySafe: "Hlala ukhuselekile ngalo mzuzu",
    staySafeText:
      "Themba intuition yakho, yiya ebantwini nasekukhanyeni, uze ucele uncedo ngaphambi kokuba imeko ibe mandundu.",
    selfDefence: "Iziseko zokuzikhusela",
    selfDefenceText:
      "Yenza umgama, sebenzisa ilizwi lakho, khusela intloko uze uhambe xa kukho ithuba elikhuselekileyo.",
    itemGuide: "Ukusebenzisa izixhobo zakho",
    itemGuideText:
      "Vavanya iqhosha le-panic, gcina i-spray ikufuphi uze ufunde isixhobo ngasinye ngaphambi kokuba usifune.",
    stepOne: "1. Qaphela",
    stepOneText:
      "Qaphela utshintsho olukungqongileyo uze uthembe imvakalelo ekuxelela ukuba kukho into engalunganga.",
    stepTwo: "2. Yenza umgama",
    stepTwoText:
      "Suka, gcina indlela yokuphuma ibonakala uze ungavaleleki ekoneni.",
    stepThree: "3. Yazisa abantu bakho",
    stepThreeText:
      "Sebenzisa i-SOS okanye wabelane ngendlela yakho ephilayo nabafowunelwa bakho.",
    servicesTitle: "Isikhokelo sokhuseleko",
  },
};
export function t(key) {
  return messages[language.value]?.[key] || messages.English[key] || key;
}
