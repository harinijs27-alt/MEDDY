// ============================================================
// JS MEDICARE - COMPLETE SCRIPT (v2)
//
// Works in:  1) normal browser (Chrome)
//            2) Android APK built with Capacitor (native voice,
//               native speech recognition, background alarms)
// ============================================================


// ============================================================
// CONFIG
// ============================================================

// OPTIONAL: URL of your own SMS backend (MSG91 / Fast2SMS / Twilio).
// It must accept POST JSON: { "to": "+91...", "message": "..." }
// Leave "" to open the phone's SMS app instead.
const SMS_BACKEND_URL = "";

// A reminder still fires if the app is opened up to this many
// minutes AFTER the scheduled time.
const REMINDER_WINDOW_MIN = 10;

const SUPPORTED_LANGUAGES = ["en", "ta", "hi", "te"];

const LANG_CODES = {
    en: "en-IN",
    ta: "ta-IN",
    hi: "hi-IN",
    te: "te-IN"
};


// ============================================================
// GLOBAL VARIABLES
// ============================================================

let medicines = [];

let activeReminder = null;

let reminderCheckerTimer = null;
let reminderVoiceTimer = null;
let reminderMissTimer = null;

let patientName = "";
let patientPhone = "";

let selectedLanguage = "en";

let voiceEntryActive = false;
let voiceStep = null;
let voiceRun = 0;

let listenToken = 0;
let webRecognition = null;
let speaking = false;

let vibrationTimer = null;

let audioCtx = null;
let wakeLock = null;

let currentDay = "";
let nativeSetupDone = false;


// ============================================================
// NATIVE (CAPACITOR) HELPERS
// ============================================================

const isNative = !!(
    window.Capacitor &&
    typeof window.Capacitor.isNativePlatform === "function" &&
    window.Capacitor.isNativePlatform()
);

function plugin(name) {

    try {

        return (
            window.Capacitor &&
            window.Capacitor.Plugins &&
            window.Capacitor.Plugins[name]
        ) || null;

    } catch {

        return null;

    }

}

function sleep(ms) {

    return new Promise(resolve => setTimeout(resolve, ms));

}


// ============================================================
// TRANSLATIONS
// ============================================================

const translations = {

    en: {

        subtitle: "Healthcare Assistant",
        login: "Login",
        patientName: "Patient Name",
        patientPhone: "Patient Phone Number",
        language: "Language",
        enableVoice: "Enable Voice",
        dashboard: "Dashboard",
        logout: "Logout",
        welcome: "Welcome",
        Monitoring: "Online",
        totalMedicines: "Total Medicines",
        taken: "Taken",
        missed: "Missed",
        adherence: "Adherence",
        addMedicine: "Add Medicine",
        medicineName: "Medicine Name",
        dosage: "Dosage",
        time: "Time",
        add: "Add Medicine",
        addByVoice: "🎤 Add Medicine by Voice",
        caregiver: "Caregiver",
        caregiverPhone: "Caregiver Phone",
        save: "Save",
        callCaregiver: "Call Caregiver",
        emergency: "Emergency",
        ambulance: "Call Ambulance",
        nextReminder: "Next Reminder",
        medicines: "My Medicines",
        activity: "Activity Log",
        noMedicines: "No medicines added yet.",
        medicineAdded: "Medicine added successfully.",
        medicineDeleted: "Medicine deleted.",
        reminder: "It is time to take your medicine.",
        takeMedicine: "Please take your medicine now.",
        takenSuccess: "Medicine marked as taken.",
        missedMessage: "Medicine was missed.",
        voiceListening: "Listening...",
        voiceStopped: "Voice stopped.",
        voiceEnabled: "Voice enabled.",
        speakName: "Please say the medicine name.",
        speakDosage: "Please say the dosage.",
        speakTime: "Please say the medicine time.",
        medicineConfirmed: "Medicine added successfully.",
        noSpeech: "I could not hear you. Please try again.",
        voiceNotSupported: "Voice recognition is not supported on this browser.",
        caregiverSaved: "Caregiver number saved.",
        noCaregiver: "Please save caregiver number first.",
        report: "Medication Report",
        downloadReport: "Generate Medication Report",
        activityLogin: "Patient logged in.",
        activityAdded: "Medicine added.",
        activityTaken: "Medicine taken.",
        activityMissed: "Medicine missed."

    },


    ta: {

        subtitle: "சுகாதார உதவியாளர்",
        login: "உள்நுழைய",
        patientName: "நோயாளியின் பெயர்",
        patientPhone: "நோயாளியின் தொலைபேசி எண்",
        language: "மொழி",
        enableVoice: "குரலை இயக்கவும்",
        dashboard: "முகப்பு",
        logout: "வெளியேறு",
        welcome: "வரவேற்கிறோம்",
        aiMonitoring: "கண்காணிப்பு செயல்பாட்டில்",
        totalMedicines: "மொத்த மருந்துகள்",
        taken: "எடுத்தவை",
        missed: "தவறியவை",
        adherence: "மருந்து பின்பற்றல்",
        addMedicine: "மருந்து சேர்க்கவும்",
        medicineName: "மருந்தின் பெயர்",
        dosage: "அளவு",
        time: "நேரம்",
        add: "மருந்து சேர்க்கவும்",
        addByVoice: "🎤 குரல் மூலம் மருந்து சேர்க்கவும்",
        caregiver: "பராமரிப்பாளர்",
        caregiverPhone: "பராமரிப்பாளர் தொலைபேசி",
        save: "சேமிக்கவும்",
        callCaregiver: "பராமரிப்பாளரை அழைக்கவும்",
        emergency: "அவசரம்",
        ambulance: "ஆம்புலன்ஸ் அழைக்கவும்",
        nextReminder: "அடுத்த நினைவூட்டல்",
        medicines: "எனது மருந்துகள்",
        activity: "செயல்பாட்டு பதிவு",
        noMedicines: "இதுவரை மருந்துகள் சேர்க்கப்படவில்லை.",
        medicineAdded: "மருந்து வெற்றிகரமாக சேர்க்கப்பட்டது.",
        medicineDeleted: "மருந்து நீக்கப்பட்டது.",
        reminder: "உங்கள் மருந்தை எடுத்துக்கொள்ள வேண்டிய நேரம் இது.",
        takeMedicine: "இப்போது உங்கள் மருந்தை எடுத்துக்கொள்ளவும்.",
        takenSuccess: "மருந்து எடுத்ததாக பதிவு செய்யப்பட்டது.",
        missedMessage: "மருந்து தவறிவிட்டது.",
        voiceListening: "கேட்கிறது...",
        voiceStopped: "குரல் நிறுத்தப்பட்டது.",
        voiceEnabled: "குரல் இயக்கப்பட்டது.",
        speakName: "மருந்தின் பெயரை சொல்லவும்.",
        speakDosage: "மருந்தின் அளவை சொல்லவும்.",
        speakTime: "மருந்து நேரத்தை சொல்லவும்.",
        medicineConfirmed: "மருந்து வெற்றிகரமாக சேர்க்கப்பட்டது.",
        noSpeech: "உங்கள் குரல் கேட்கவில்லை. மீண்டும் முயற்சிக்கவும்.",
        voiceNotSupported: "இந்த உலாவியில் குரல் வசதி இல்லை.",
        caregiverSaved: "பராமரிப்பாளர் எண் சேமிக்கப்பட்டது.",
        noCaregiver: "முதலில் பராமரிப்பாளர் எண்ணை சேமிக்கவும்.",
        report: "மருந்து அறிக்கை",
        downloadReport: "மருந்து அறிக்கையை உருவாக்கவும்",
        activityLogin: "நோயாளி உள்நுழைந்தார்.",
        activityAdded: "மருந்து சேர்க்கப்பட்டது.",
        activityTaken: "மருந்து எடுக்கப்பட்டது.",
        activityMissed: "மருந்து தவறிவிட்டது."

    },


    hi: {

        subtitle: "संचालित स्वास्थ्य सहायक",
        login: "लॉगिन",
        patientName: "मरीज का नाम",
        patientPhone: "मरीज का फोन नंबर",
        language: "भाषा",
        enableVoice: "वॉइस सक्षम करें",
        dashboard: "डैशबोर्ड",
        logout: "लॉगआउट",
        welcome: "स्वागत है",
        aiMonitoring: "ऑनलाइन",
        totalMedicines: "कुल दवाएं",
        taken: "ली गई",
        missed: "छूटी",
        adherence: "दवा पालन",
        addMedicine: "दवा जोड़ें",
        medicineName: "दवा का नाम",
        dosage: "खुराक",
        time: "समय",
        add: "दवा जोड़ें",
        addByVoice: "🎤 आवाज से दवा जोड़ें",
        caregiver: "देखभालकर्ता",
        caregiverPhone: "देखभालकर्ता फोन",
        save: "सेव करें",
        callCaregiver: "देखभालकर्ता को कॉल करें",
        emergency: "आपातकाल",
        ambulance: "एम्बुलेंस कॉल करें",
        nextReminder: "अगला रिमाइंडर",
        medicines: "मेरी दवाएं",
        activity: "गतिविधि लॉग",
        noMedicines: "अभी तक कोई दवा नहीं जोड़ी गई है।",
        medicineAdded: "दवा सफलतापूर्वक जोड़ी गई।",
        medicineDeleted: "दवा हटा दी गई।",
        reminder: "अब आपकी दवा लेने का समय है।",
        takeMedicine: "कृपया अभी अपनी दवा लें।",
        takenSuccess: "दवा लेने के रूप में दर्ज किया गया।",
        missedMessage: "दवा छूट गई है।",
        voiceListening: "सुन रहा है...",
        voiceStopped: "वॉइस बंद।",
        voiceEnabled: "वॉइस सक्षम है।",
        speakName: "कृपया दवा का नाम बोलें।",
        speakDosage: "कृपया दवा की खुराक बोलें।",
        speakTime: "कृपया दवा का समय बोलें।",
        medicineConfirmed: "दवा सफलतापूर्वक जोड़ी गई।",
        noSpeech: "आपकी आवाज नहीं सुनाई दी। फिर से प्रयास करें।",
        voiceNotSupported: "इस ब्राउज़र में वॉइस रिकग्निशन उपलब्ध नहीं है।",
        caregiverSaved: "देखभालकर्ता नंबर सेव किया गया।",
        noCaregiver: "कृपया पहले देखभालकर्ता नंबर सेव करें।",
        report: "दवा रिपोर्ट",
        downloadReport: "दवा रिपोर्ट बनाएं",
        activityLogin: "मरीज ने लॉगिन किया।",
        activityAdded: "दवा जोड़ी गई।",
        activityTaken: "दवा ली गई।",
        activityMissed: "दवा छूट गई।"

    },


    te: {

        subtitle: "AI ఆధారిత ఆరోగ్య సహాయకుడు",
        login: "లాగిన్",
        patientName: "రోగి పేరు",
        patientPhone: "రోగి ఫోన్ నంబర్",
        language: "భాష",
        enableVoice: "వాయిస్ ప్రారంభించండి",
        dashboard: "డాష్‌బోర్డ్",
        logout: "లాగౌట్",
        welcome: "స్వాగతం",
        aiMonitoring: "పర్యవేక్షణ ఆన్‌లైన్‌లో ఉంది",
        totalMedicines: "మొత్తం మందులు",
        taken: "తీసుకున్నవి",
        missed: "మిస్ అయినవి",
        adherence: "మందుల పాటింపు",
        addMedicine: "మందు జోడించండి",
        medicineName: "మందు పేరు",
        dosage: "మోతాదు",
        time: "సమయం",
        add: "మందు జోడించండి",
        addByVoice: "🎤 వాయిస్ ద్వారా మందు జోడించండి",
        caregiver: "కేర్‌గివర్",
        caregiverPhone: "కేర్‌గివర్ ఫోన్",
        save: "సేవ్ చేయండి",
        callCaregiver: "కేర్‌గివర్‌కు కాల్ చేయండి",
        emergency: "అత్యవసరం",
        ambulance: "అంబులెన్స్‌కు కాల్ చేయండి",
        nextReminder: "తదుపరి రిమైండర్",
        medicines: "నా మందులు",
        activity: "యాక్టివిటీ లాగ్",
        noMedicines: "ఇంకా మందులు జోడించలేదు.",
        medicineAdded: "మందు విజయవంతంగా జోడించబడింది.",
        medicineDeleted: "మందు తొలగించబడింది.",
        reminder: "మీ మందు తీసుకునే సమయం వచ్చింది.",
        takeMedicine: "దయచేసి ఇప్పుడు మీ మందు తీసుకోండి.",
        takenSuccess: "మందు తీసుకున్నట్లు నమోదు చేయబడింది.",
        missedMessage: "మందు మిస్ అయింది.",
        voiceListening: "వింటోంది...",
        voiceStopped: "వాయిస్ ఆపబడింది.",
        voiceEnabled: "వాయిస్ ప్రారంభించబడింది.",
        speakName: "దయచేసి మందు పేరు చెప్పండి.",
        speakDosage: "దయచేసి మందు మోతాదు చెప్పండి.",
        speakTime: "దయచేసి మందు సమయం చెప్పండి.",
        medicineConfirmed: "మందు విజయవంతంగా జోడించబడింది.",
        noSpeech: "మీ మాట వినిపించలేదు. మళ్లీ ప్రయత్నించండి.",
        voiceNotSupported: "ఈ బ్రౌజర్‌లో వాయిస్ రికగ్నిషన్ అందుబాటులో లేదు.",
        caregiverSaved: "కేర్‌గివర్ నంబర్ సేవ్ చేయబడింది.",
        noCaregiver: "దయచేసి ముందుగా కేర్‌గివర్ నంబర్‌ను సేవ్ చేయండి.",
        report: "మందుల నివేదిక",
        downloadReport: "మందుల నివేదిక రూపొందించండి",
        activityLogin: "రోగి లాగిన్ అయ్యారు.",
        activityAdded: "మందు జోడించబడింది.",
        activityTaken: "మందు తీసుకున్నారు.",
        activityMissed: "మందు మిస్ అయింది."

    }

};


// ------------------------------------------------------------
// EXTRA TRANSLATIONS (texts that used to be English-only)
// ------------------------------------------------------------

const extraTranslations = {

    en: {
        reminderTitle: "Medicine Reminder",
        tookIt: "✓ I Took It",
        status: "Status",
        delete: "Delete",
        step1: "1. Name",
        step2: "2. Dosage",
        step3: "3. Time",
        aiTitle: "Monitoring",
        aiText: "Medication reminders, adherence tracking and caregiver alerts are active.",
        pending: "Pending",
        takenS: "Taken",
        missedS: "Missed",
        fillAll: "Please enter medicine name, dosage and time.",
        nameRequired: "Patient name is required.",
        enterName: "Enter patient name",
        enterPhone: "Enter phone number",
        popupBlocked: "Please allow popups to generate the report.",
        tapHint: "Tap anywhere on the screen, or say \"I took it\", to confirm.",
        micDenied: "Microphone permission is needed for voice features.",
        timeRetry: "I did not understand the time. Please say it like 8 30 PM."
    },

    ta: {
        reminderTitle: "மருந்து நினைவூட்டல்",
        tookIt: "✓ எடுத்துவிட்டேன்",
        status: "நிலை",
        delete: "நீக்கு",
        step1: "1. பெயர்",
        step2: "2. அளவு",
        step3: "3. நேரம்",
        aiTitle: "கண்காணிப்பு",
        aiText: "மருந்து நினைவூட்டல்கள், பின்பற்றல் கண்காணிப்பு மற்றும் பராமரிப்பாளர் எச்சரிக்கைகள் செயலில் உள்ளன.",
        pending: "நிலுவையில்",
        takenS: "எடுத்தது",
        missedS: "தவறியது",
        fillAll: "மருந்தின் பெயர், அளவு மற்றும் நேரத்தை உள்ளிடவும்.",
        nameRequired: "நோயாளியின் பெயர் தேவை.",
        enterName: "நோயாளியின் பெயரை உள்ளிடவும்",
        enterPhone: "தொலைபேசி எண்ணை உள்ளிடவும்",
        popupBlocked: "அறிக்கை உருவாக்க பாப்-அப்களை அனுமதிக்கவும்.",
        tapHint: "உறுதிப்படுத்த திரையில் எங்கும் தட்டவும், அல்லது \"எடுத்துவிட்டேன்\" என்று சொல்லவும்.",
        micDenied: "குரல் வசதிகளுக்கு மைக்ரோஃபோன் அனுமதி தேவை.",
        timeRetry: "நேரம் புரியவில்லை. \"இரவு 8:30\" போல சொல்லவும்."
    },

    hi: {
        reminderTitle: "दवा रिमाइंडर",
        tookIt: "✓ मैंने ले ली",
        status: "स्थिति",
        delete: "हटाएं",
        step1: "1. नाम",
        step2: "2. खुराक",
        step3: "3. समय",
        aiTitle: "निगरानी",
        aiText: "दवा रिमाइंडर, पालन ट्रैकिंग और देखभालकर्ता अलर्ट सक्रिय हैं।",
        pending: "लंबित",
        takenS: "ली गई",
        missedS: "छूटी",
        fillAll: "कृपया दवा का नाम, खुराक और समय दर्ज करें।",
        nameRequired: "मरीज का नाम आवश्यक है।",
        enterName: "मरीज का नाम दर्ज करें",
        enterPhone: "फोन नंबर दर्ज करें",
        popupBlocked: "रिपोर्ट बनाने के लिए पॉपअप की अनुमति दें।",
        tapHint: "पुष्टि के लिए स्क्रीन पर कहीं भी टैप करें, या \"मैंने दवा ले ली\" बोलें।",
        micDenied: "वॉइस सुविधाओं के लिए माइक्रोफोन अनुमति चाहिए।",
        timeRetry: "समय समझ नहीं आया। कृपया \"रात 8:30\" जैसे बोलें।"
    },

    te: {
        reminderTitle: "మందు రిమైండర్",
        tookIt: "✓ నేను తీసుకున్నాను",
        status: "స్థితి",
        delete: "తొలగించు",
        step1: "1. పేరు",
        step2: "2. మోతాదు",
        step3: "3. సమయం",
        aiTitle: "పర్యవేక్షణ",
        aiText: "మందుల రిమైండర్లు, పాటింపు ట్రాకింగ్ మరియు కేర్‌గివర్ హెచ్చరికలు సక్రియంగా ఉన్నాయి.",
        pending: "పెండింగ్",
        takenS: "తీసుకున్నది",
        missedS: "మిస్ అయినది",
        fillAll: "దయచేసి మందు పేరు, మోతాదు మరియు సమయం నమోదు చేయండి.",
        nameRequired: "రోగి పేరు అవసరం.",
        enterName: "రోగి పేరు నమోదు చేయండి",
        enterPhone: "ఫోన్ నంబర్ నమోదు చేయండి",
        popupBlocked: "నివేదిక రూపొందించడానికి పాప్‌అప్‌లను అనుమతించండి.",
        tapHint: "నిర్ధారించడానికి స్క్రీన్‌పై ఎక్కడైనా తాకండి, లేదా \"మందు తీసుకున్నాను\" అని చెప్పండి.",
        micDenied: "వాయిస్ ఫీచర్లకు మైక్రోఫోన్ అనుమతి అవసరం.",
        timeRetry: "సమయం అర్థం కాలేదు. \"రాత్రి 8:30\" లాగా చెప్పండి."
    }

};

Object.keys(extraTranslations).forEach(lang => {

    Object.assign(translations[lang], extraTranslations[lang]);

});


// ============================================================
// GET TEXT
// ============================================================

function getText(key) {

    return (
        translations[selectedLanguage]?.[key] ||
        translations.en[key] ||
        key
    );

}


function statusText(status) {

    const map = {
        pending: "pending",
        taken: "takenS",
        missed: "missedS"
    };

    return getText(map[status] || "pending");

}


// ============================================================
// LANGUAGE  (selectedLanguage is the single source of truth)
// ============================================================

function getCurrentLanguage() {

    return SUPPORTED_LANGUAGES.includes(selectedLanguage)
        ? selectedLanguage
        : "en";

}


function applyLanguage() {

    selectedLanguage = getCurrentLanguage();

    localStorage.setItem(
        "jsMedicareLanguage",
        selectedLanguage
    );

    // Screen readers use this to choose the right pronunciation
    document.documentElement.lang = selectedLanguage;


    document
        .querySelectorAll("[data-i18n]")
        .forEach(element => {

            const key = element.getAttribute("data-i18n");

            if (translations[selectedLanguage]?.[key]) {

                element.textContent =
                    translations[selectedLanguage][key];

            }

        });


    document
        .querySelectorAll("[data-i18n-placeholder]")
        .forEach(element => {

            const key = element.getAttribute("data-i18n-placeholder");

            if (translations[selectedLanguage]?.[key]) {

                element.placeholder =
                    translations[selectedLanguage][key];

            }

        });


    document
        .querySelectorAll("[data-i18n-aria]")
        .forEach(element => {

            const key = element.getAttribute("data-i18n-aria");

            if (translations[selectedLanguage]?.[key]) {

                element.setAttribute(
                    "aria-label",
                    translations[selectedLanguage][key]
                );

            }

        });


    const dashboardLanguage =
        document.getElementById("dashboardLanguage");

    if (dashboardLanguage) {
        dashboardLanguage.value = selectedLanguage;
    }


    const languageSelect =
        document.getElementById("languageSelect");

    if (languageSelect) {
        languageSelect.value = selectedLanguage;
    }


    // Re-render all dynamic text
    updateDashboard();
    renderMedicines();
    updateNextReminder();

}


// Called by the LOGIN language dropdown
function setLoginLanguage(value) {

    if (!SUPPORTED_LANGUAGES.includes(value)) return;

    selectedLanguage = value;

    applyLanguage();

}


// Called by the DASHBOARD language dropdown
function changeDashboardLanguage() {

    const select = document.getElementById("dashboardLanguage");

    if (!select) return;

    selectedLanguage = select.value;

    applyLanguage();

    // Reminder notifications must use the new language too
    syncNotifications();

}


// ============================================================
// DATE HELPERS / DAILY RESET
// ============================================================

function todayString() {

    return new Date().toLocaleDateString("en-CA");

}


// Every new day all medicines become "pending" again
function rolloverDay() {

    const today = todayString();

    if (currentDay === today) return false;

    currentDay = today;

    const stored = localStorage.getItem("jsMedicareLastDate");

    let changed = false;

    if (stored !== today) {

        medicines.forEach(medicine => {

            if (medicine.status !== "pending") {

                medicine.status = "pending";
                medicine.takenAt = null;
                medicine.missedAt = null;
                changed = true;

            }

        });

        localStorage.setItem("jsMedicareLastDate", today);

        // remove old "already reminded" markers
        Object.keys(localStorage).forEach(key => {

            if (
                key.startsWith("reminder_") &&
                !key.endsWith("_" + today)
            ) {
                localStorage.removeItem(key);
            }

        });

        if (changed) saveMedicines();

    }

    return changed;

}


// ============================================================
// LOAD DATA
// ============================================================

function loadData() {

    try {

        medicines = JSON.parse(
            localStorage.getItem("jsMedicareMedicines") || "[]"
        );

    } catch {

        medicines = [];

    }


    patientName =
        localStorage.getItem("jsMedicarePatientName") || "";

    patientPhone =
        localStorage.getItem("jsMedicarePatientPhone") || "";


    const savedLanguage =
        localStorage.getItem("jsMedicareLanguage");

    selectedLanguage =
        SUPPORTED_LANGUAGES.includes(savedLanguage)
            ? savedLanguage
            : "en";


    const caregiver =
        localStorage.getItem("jsMedicareCaregiver");

    const caregiverInput =
        document.getElementById("caregiverPhone");

    if (caregiverInput && caregiver) {
        caregiverInput.value = caregiver;
    }

    rolloverDay();

}


// ============================================================
// SAVE
// ============================================================

function saveMedicines() {

    localStorage.setItem(
        "jsMedicareMedicines",
        JSON.stringify(medicines)
    );

}


// ============================================================
// PAGE LOAD
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadData();

        applyLanguage();

        restoreLoginState();

        startReminderChecker();

        // Browsers only allow audio after a user gesture
        const unlockOnce = function () {

            unlockAudio();

            document.removeEventListener("click", unlockOnce);
            document.removeEventListener("touchstart", unlockOnce);

        };

        document.addEventListener("click", unlockOnce);
        document.addEventListener("touchstart", unlockOnce);

    }
);


document.addEventListener(
    "visibilitychange",
    function () {

        if (document.visibilityState === "visible") {

            keepAwake();

            checkReminders();

        }

    }
);


// ============================================================
// LOGIN
// ============================================================

function login() {

    unlockAudio();

    const nameInput = document.getElementById("patientName");
    const phoneInput = document.getElementById("patientPhone");
    const languageInput = document.getElementById("languageSelect");


    patientName = nameInput?.value.trim() || "";
    patientPhone = phoneInput?.value.trim() || "";

    const chosen = languageInput?.value || selectedLanguage;

    selectedLanguage =
        SUPPORTED_LANGUAGES.includes(chosen) ? chosen : "en";


    if (!patientName) {

        applyLanguage();

        alert(getText("nameRequired"));

        return;

    }


    localStorage.setItem("jsMedicarePatientName", patientName);
    localStorage.setItem("jsMedicarePatientPhone", patientPhone);

    applyLanguage();


    document.getElementById("loginSection").style.display = "none";
    document.getElementById("dashboard").style.display = "block";


    onLoggedIn();

    logActivity(getText("activityLogin"));

}


// ============================================================
// RESTORE LOGIN
// ============================================================

function restoreLoginState() {

    if (!patientName) return;

    const loginSection = document.getElementById("loginSection");
    const dashboard = document.getElementById("dashboard");

    if (loginSection) loginSection.style.display = "none";
    if (dashboard) dashboard.style.display = "block";

    onLoggedIn();

}


function onLoggedIn() {

    keepAwake();

    setupNativeFeatures().then(syncNotifications);

}


// ============================================================
// LOGOUT
// ============================================================

function logout() {

    stopReminderCompletely();

    stopVoiceMedicineEntry();


    patientName = "";
    patientPhone = "";


    localStorage.removeItem("jsMedicarePatientName");
    localStorage.removeItem("jsMedicarePatientPhone");


    document.getElementById("dashboard").style.display = "none";
    document.getElementById("loginSection").style.display = "flex";

}


// ============================================================
// UPDATE DASHBOARD
// ============================================================

function updateDashboard() {

    const welcome = document.getElementById("welcomeText");

    if (welcome) {

        welcome.textContent =
            getText("welcome") + ", " + patientName;

    }


    const total = document.getElementById("totalMedicines");
    const taken = document.getElementById("takenMedicines");
    const missed = document.getElementById("missedMedicines");
    const adherence = document.getElementById("adherence");


    const totalCount = medicines.length;

    const takenCount =
        medicines.filter(m => m.status === "taken").length;

    const missedCount =
        medicines.filter(m => m.status === "missed").length;


    if (total) total.textContent = totalCount;
    if (taken) taken.textContent = takenCount;
    if (missed) missed.textContent = missedCount;


    if (adherence) {

        const completed = takenCount + missedCount;

        const percentage =
            completed === 0
                ? 0
                : Math.round((takenCount / completed) * 100);

        adherence.textContent = percentage + "%";

    }

}


// ============================================================
// ADD MEDICINE
// ============================================================

function addMedicine() {

    const name =
        document.getElementById("medicineName")?.value.trim();

    const dosage =
        document.getElementById("dosage")?.value.trim();

    const time =
        document.getElementById("medicineTime")?.value;


    if (!name || !dosage || !time) {

        alert(getText("fillAll"));

        return;

    }


    const medicine = {

        id: Date.now().toString(),
        name: name,
        dosage: dosage,
        time: time,
        medicineTime: time,
        status: "pending",
        createdAt: new Date().toISOString(),
        missedAt: null,
        takenAt: null

    };


    medicines.push(medicine);

    saveMedicines();


    document.getElementById("medicineName").value = "";
    document.getElementById("dosage").value = "";
    document.getElementById("medicineTime").value = "";


    renderMedicines();
    updateDashboard();
    updateNextReminder();

    syncNotifications();


    logActivity(getText("activityAdded") + " " + name);

    setVoiceStatus("");

    alert(getText("medicineAdded"));

}


// ============================================================
// RENDER MEDICINES
// ============================================================

function renderMedicines() {

    const container = document.getElementById("medicineList");

    if (!container) return;


    if (medicines.length === 0) {

        container.innerHTML = `<p>${escapeHTML(getText("noMedicines"))}</p>`;

        return;

    }


    container.innerHTML = "";


    medicines.forEach(medicine => {

        const card = document.createElement("div");

        card.className = "medicine-card";


        const content = document.createElement("div");

        content.innerHTML = `

            <strong>${escapeHTML(medicine.name)}</strong>

            <div>${escapeHTML(medicine.dosage)}</div>

            <div>${formatTime(medicine.time)}</div>

            <div>
                ${escapeHTML(getText("status"))}:
                ${escapeHTML(statusText(medicine.status))}
            </div>

        `;


        const button = document.createElement("button");

        button.className = "delete-btn";

        button.textContent = getText("delete");

        button.setAttribute(
            "aria-label",
            getText("delete") + " " + medicine.name
        );

        button.onclick = function () {

            deleteMedicine(medicine.id);

        };


        card.appendChild(content);
        card.appendChild(button);

        container.appendChild(card);

    });

}


// ============================================================
// DELETE MEDICINE
// ============================================================

function deleteMedicine(id) {

    if (activeReminder && activeReminder.id === id) {

        stopReminderCompletely();

    }


    medicines = medicines.filter(medicine => medicine.id !== id);

    saveMedicines();

    renderMedicines();
    updateDashboard();
    updateNextReminder();

    syncNotifications();

}


// ============================================================
// FORMAT TIME
// ============================================================

function formatTime(time) {

    if (!time) return "";

    const parts = time.split(":");

    let hour = parseInt(parts[0], 10);

    const minute = parts[1];

    const ampm = hour >= 12 ? "PM" : "AM";

    hour = hour % 12 || 12;

    return hour + ":" + minute + " " + ampm;

}


// ============================================================
// AUDIO: BEEP FALLBACK (works even if speech voice is missing)
// ============================================================

function unlockAudio() {

    try {

        const AC = window.AudioContext || window.webkitAudioContext;

        if (!AC) return;

        if (!audioCtx) audioCtx = new AC();

        if (audioCtx.state === "suspended") audioCtx.resume();

    } catch (error) {

        console.log("Audio unlock failed:", error);

    }

}


function playBeep() {

    if (!audioCtx || audioCtx.state !== "running") return;

    try {

        const start = audioCtx.currentTime;

        [880, 660, 880].forEach((frequency, index) => {

            const oscillator = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            const t = start + index * 0.25;

            oscillator.type = "square";
            oscillator.frequency.value = frequency;

            gain.gain.setValueAtTime(0.25, t);
            gain.gain.setValueAtTime(0, t + 0.2);

            oscillator.connect(gain);
            gain.connect(audioCtx.destination);

            oscillator.start(t);
            oscillator.stop(t + 0.22);

        });

    } catch (error) {

        console.log("Beep failed:", error);

    }

}


// ============================================================
// KEEP SCREEN AWAKE (helps timers run in browsers)
// ============================================================

async function keepAwake() {

    try {

        if ("wakeLock" in navigator && !wakeLock) {

            wakeLock = await navigator.wakeLock.request("screen");

            wakeLock.addEventListener("release", () => {
                wakeLock = null;
            });

        }

    } catch (error) {

        console.log("Wake lock unavailable:", error);

    }

}


// ============================================================
// TEXT TO SPEECH  (native plugin first, browser fallback)
// ============================================================

function speakAsync(text) {

    return new Promise(resolve => {

        let finished = false;
        let safety = null;

        const done = function () {

            if (finished) return;

            finished = true;
            speaking = false;

            if (safety) clearTimeout(safety);

            resolve();

        };


        speaking = true;

        safety = setTimeout(done, 20000);


        const lang = LANG_CODES[selectedLanguage] || "en-IN";

        const TTS = plugin("TextToSpeech");


        // ---------- Native Android ----------
        if (isNative && TTS) {

            try {

                TTS.speak({
                    text: text,
                    lang: lang,
                    rate: 0.85,
                    pitch: 1.0,
                    volume: 1.0,
                    category: "playback"
                })
                    .then(done)
                    .catch(done);

            } catch (error) {

                done();

            }

            return;

        }


        // ---------- Browser ----------
        if (!("speechSynthesis" in window)) {

            done();

            return;

        }


        try {

            speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);

            utterance.lang = lang;
            utterance.rate = 0.85;
            utterance.pitch = 1;
            utterance.volume = 1;

            const voices = speechSynthesis.getVoices() || [];

            const wanted = lang.toLowerCase();

            const voice =
                voices.find(v =>
                    v.lang.replace("_", "-").toLowerCase() === wanted
                ) ||
                voices.find(v =>
                    v.lang.toLowerCase().startsWith(wanted.slice(0, 2))
                );

            if (voice) utterance.voice = voice;

            utterance.onend = done;
            utterance.onerror = done;

            speechSynthesis.speak(utterance);

        } catch (error) {

            done();

        }

    });

}


function speakText(text) {

    speakAsync(text);

}


function stopSpeaking() {

    speaking = false;

    const TTS = plugin("TextToSpeech");

    if (isNative && TTS) {

        try {

            Promise.resolve(TTS.stop()).catch(() => {});

        } catch {}

    }

    if ("speechSynthesis" in window) {

        try {
            speechSynthesis.cancel();
        } catch {}

    }

}


// ============================================================
// SPEECH RECOGNITION  (native plugin first, browser fallback)
// ============================================================

function canListen() {

    if (isNative && plugin("SpeechRecognition")) return true;

    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);

}


async function ensureMicPermission() {

    const SR = plugin("SpeechRecognition");

    if (isNative && SR) {

        try {

            const result = await SR.requestPermissions();

            return result.speechRecognition === "granted";

        } catch {

            return false;

        }

    }

    return true;

}


function stopListening() {

    listenToken++;

    if (webRecognition) {

        try {
            webRecognition.abort();
        } catch {}

        webRecognition = null;

    }

    const SR = plugin("SpeechRecognition");

    if (isNative && SR) {

        try {

            Promise.resolve(SR.stop()).catch(() => {});

        } catch {}

    }

}


// Listens once and resolves with the transcript(s) joined by " | "
function listenOnce(lang) {

    const SR = plugin("SpeechRecognition");


    // ---------- Native Android ----------
    if (isNative && SR) {

        return (async function () {

            const result = await SR.start({
                language: lang,
                maxResults: 5,
                prompt: "",
                partialResults: false,
                popup: false
            });

            return (result && result.matches || []).join(" | ");

        })();

    }


    // ---------- Browser ----------
    return new Promise((resolve, reject) => {

        const Recognition =
            window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!Recognition) {

            reject(new Error("unsupported"));

            return;

        }


        const recognition = new Recognition();

        webRecognition = recognition;

        recognition.lang = lang;
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 5;

        let transcript = "";

        recognition.onresult = function (event) {

            const alternatives = [];

            for (let i = 0; i < event.results.length; i++) {

                for (let j = 0; j < event.results[i].length; j++) {

                    alternatives.push(event.results[i][j].transcript);

                }

            }

            transcript = alternatives.join(" | ");

        };

        recognition.onerror = function (event) {

            if (
                event.error === "not-allowed" ||
                event.error === "service-not-allowed"
            ) {

                reject(new Error(event.error));

            }

        };

        recognition.onend = function () {

            if (webRecognition === recognition) webRecognition = null;

            resolve(transcript);

        };

        try {

            recognition.start();

        } catch (error) {

            reject(error);

        }

    });

}


// ============================================================
// "I TOOK IT" LISTENING LOOP
// ============================================================

async function startTakenListening(medicineId) {

    if (!canListen()) return;

    const token = ++listenToken;

    const regional = LANG_CODES[selectedLanguage] || "en-IN";

    // Regional language first, then English
    const languages = [...new Set([regional, "en-IN"])];

    let attempt = 0;


    const stillValid = function () {

        return (
            token === listenToken &&
            activeReminder &&
            activeReminder.id === medicineId
        );

    };


    while (stillValid()) {

        try {

            const text = await listenOnce(
                languages[attempt % languages.length]
            );

            if (!stillValid()) return;

            console.log("🎤 HEARD:", text);

            if (text && detectTakenCommand(text.toLowerCase())) {

                markTaken(medicineId);

                return;

            }

        } catch (error) {

            const message = String(error && (error.message || error));

            console.log("🎤 Recognition error:", message);

            if (/not-allowed|denied|service/i.test(message)) return;

            await sleep(800);

        }

        attempt++;

        await sleep(300);

    }

}


// ============================================================
// REMINDER CHECKER
// ============================================================

function startReminderChecker() {

    if (reminderCheckerTimer) clearInterval(reminderCheckerTimer);

    reminderCheckerTimer = setInterval(checkReminders, 1000);

}


function checkReminders() {

    if (rolloverDay()) {

        renderMedicines();
        updateDashboard();
        updateNextReminder();

    }


    if (activeReminder) return;


    const now = new Date();

    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const today = todayString();


    for (const medicine of medicines) {

        if (medicine.status !== "pending" || !medicine.time) continue;


        const parts = medicine.time.split(":").map(Number);

        const scheduled = parts[0] * 60 + parts[1];

        const difference = nowMinutes - scheduled;

        // not yet due, or too late
        if (difference < 0 || difference > REMINDER_WINDOW_MIN) continue;


        // Medicine added AFTER today's time has passed -> wait for tomorrow
        const scheduledToday = new Date();

        scheduledToday.setHours(parts[0], parts[1], 0, 0);

        if (new Date(medicine.createdAt) > scheduledToday) continue;


        const reminderKey = "reminder_" + medicine.id + "_" + today;

        if (localStorage.getItem(reminderKey)) continue;

        localStorage.setItem(reminderKey, "1");

        triggerReminder(medicine);

        break;

    }

}


// ============================================================
// TRIGGER REMINDER
// ============================================================

function triggerReminder(medicine) {

    if (activeReminder) return;

    activeReminder = medicine;

    clearReminderTimers();

    showReminderPopup(medicine);

    startContinuousVibration();


    runReminderCycle(medicine);


    // Repeat every 10 seconds
    reminderVoiceTimer = setInterval(function () {

        if (!activeReminder) return;

        if (speaking) return;

        runReminderCycle(medicine);

    }, 10000);


    // Missed after 60 seconds
    reminderMissTimer = setTimeout(function () {

        if (activeReminder && activeReminder.id === medicine.id) {

            markMissed(medicine.id);

        }

    }, 60000);

}


async function runReminderCycle(medicine) {

    stopListening();

    playBeep();

    await sleep(800);

    if (!activeReminder || activeReminder.id !== medicine.id) return;


    const message =
        medicine.name + ". " +
        medicine.dosage + ". " +
        getText("reminder");

    await speakAsync(message);


    if (activeReminder && activeReminder.id === medicine.id) {

        startTakenListening(medicine.id);

    }

}


// ============================================================
// SHOW POPUP
// ============================================================

function showReminderPopup(medicine) {

    const popup = document.getElementById("reminderPopup");
    const name = document.getElementById("popupMedicineName");
    const text = document.getElementById("popupReminderText");
    const button = document.getElementById("popupTakeButton");


    if (name) name.textContent = medicine.name;

    if (text) {

        text.textContent =
            medicine.dosage + " - " + getText("reminder");

    }


    if (popup) {

        popup.style.display = "flex";

        popup.classList.add("active");

    }


    // Screen readers start reading from the confirm button
    if (button) button.focus();

}


// ============================================================
// VIBRATION
// ============================================================

function vibrateOnce() {

    if (navigator.vibrate) {

        navigator.vibrate([800, 300]);

        return;

    }

    const Haptics = plugin("Haptics");

    if (isNative && Haptics) {

        try {

            Haptics.vibrate({ duration: 800 });

        } catch {}

    }

}


function startContinuousVibration() {

    stopContinuousVibration();

    vibrateOnce();

    vibrationTimer = setInterval(vibrateOnce, 1100);

}


function stopContinuousVibration() {

    if (vibrationTimer) {

        clearInterval(vibrationTimer);

        vibrationTimer = null;

    }

    if (navigator.vibrate) navigator.vibrate(0);

}


// ============================================================
// POPUP CONFIRM (button or tap anywhere)
// ============================================================

function markTakenFromPopup() {

    if (!activeReminder) return;

    markTaken(activeReminder.id);

}


// ============================================================
// MARK TAKEN
// ============================================================

function markTaken(id) {

    const medicine = medicines.find(m => m.id === id);

    if (!medicine) return;


    medicine.status = "taken";
    medicine.takenAt = new Date().toISOString();
    medicine.missedAt = null;

    saveMedicines();

    stopReminderCompletely();

    renderMedicines();
    updateDashboard();
    updateNextReminder();


    logActivity(getText("activityTaken") + " " + medicine.name);


    setTimeout(function () {

        speakText(medicine.name + ". " + getText("takenSuccess"));

    }, 200);

}


// ============================================================
// MARK MISSED
// ============================================================

function markMissed(id) {

    const medicine = medicines.find(m => m.id === id);

    if (!medicine) return;


    medicine.status = "missed";
    medicine.missedAt = new Date().toISOString();

    saveMedicines();

    stopReminderCompletely();

    renderMedicines();
    updateDashboard();
    updateNextReminder();


    logActivity(getText("activityMissed") + " " + medicine.name);


    speakText(medicine.name + ". " + getText("missedMessage"));


    setTimeout(function () {

        sendCaregiverSMS(medicine);

    }, 1500);

}


// ============================================================
// STOP REMINDER COMPLETELY
// ============================================================

function stopReminderCompletely() {

    clearReminderTimers();

    stopListening();

    stopContinuousVibration();

    stopSpeaking();


    const popup = document.getElementById("reminderPopup");

    if (popup) {

        popup.classList.remove("active");

        popup.style.display = "none";

    }


    activeReminder = null;

}


function clearReminderTimers() {

    if (reminderVoiceTimer) {

        clearInterval(reminderVoiceTimer);

        reminderVoiceTimer = null;

    }

    if (reminderMissTimer) {

        clearTimeout(reminderMissTimer);

        reminderMissTimer = null;

    }

}


// ============================================================
// DETECT "I TOOK IT"
// ============================================================

function detectTakenCommand(text) {

    if (!text) return false;

    text = text.toLowerCase().trim();

    console.log("🔎 CHECKING:", text);


    // ---------------- ENGLISH ----------------

    const englishCommands = [

        "i took it", "i took the medicine", "i took my medicine",
        "i took medicine", "i have taken it", "i have taken the medicine",
        "i have taken my medicine", "i have taken medicine",
        "i already took it", "i already took the medicine",
        "i already took my medicine", "i took", "took it",
        "took the medicine", "took medicine", "medicine taken",
        "medicine is taken", "medicine was taken", "medicine done",
        "medicine completed", "medicine finished", "taken", "done",
        "completed", "finished", "yes i took it", "yes took it",
        "yes done", "yes i have taken it"

    ];

    for (const command of englishCommands) {

        if (text.includes(command)) return true;

    }


    if (
        /\b(i\s+)?(took|taken|have\s+taken)\b/i.test(text) &&
        /\b(it|medicine|medication|tablet|pill)\b/i.test(text)
    ) {

        return true;

    }


    // ---------------- TAMIL ----------------

    const tamilCommands = [

        "எடுத்துவிட்டேன்", "எடுத்து விட்டேன்", "மருந்து எடுத்துவிட்டேன்",
        "மருந்து எடுத்தேன்", "மருந்தை எடுத்துவிட்டேன்",
        "மருந்தை எடுத்தேன்", "மருந்து எடுத்தாச்சு",
        "மருந்தை எடுத்தாச்சு", "எடுத்தாச்சு", "முடிந்தது",
        "மருந்து முடிந்தது", "நான் மருந்து எடுத்தேன்",
        "நான் எடுத்துவிட்டேன்", "சாப்பிட்டேன்", "போட்டுக்கொண்டேன்"

    ];

    for (const command of tamilCommands) {

        if (text.includes(command)) return true;

    }


    // ---------------- HINDI ----------------

    const hindiCommands = [

        "मैंने दवा ले ली", "मैंने दवाई ले ली", "दवा ले ली",
        "दवाई ले ली", "दवा लिया", "दवाई लिया", "ले लिया", "ले ली",
        "हो गया", "मैंने ले लिया", "मैंने ले ली", "दवा ले लिया",
        "खा ली", "खा लिया"

    ];

    for (const command of hindiCommands) {

        if (text.includes(command)) return true;

    }


    // ---------------- TELUGU ----------------

    const teluguCommands = [

        "నేను మందు తీసుకున్నాను", "మందు తీసుకున్నాను",
        "మందు తీసుకున్నా", "తీసుకున్నాను", "తీసుకున్నా",
        "మందు తీసుకున్న", "పూర్తయింది", "మందు పూర్తయింది",
        "నేను తీసుకున్నాను", "వేసుకున్నాను", "వేసుకున్నా"

    ];

    for (const command of teluguCommands) {

        if (text.includes(command)) return true;

    }


    return false;

}


// ============================================================
// VOICE MEDICINE ENTRY
// ============================================================

async function startVoiceMedicineEntry() {

    if (!canListen()) {

        alert(getText("voiceNotSupported"));

        return;

    }


    stopVoiceMedicineEntry();

    unlockAudio();


    if (!(await ensureMicPermission())) {

        alert(getText("micDenied"));

        return;

    }


    voiceEntryActive = true;

    const run = ++voiceRun;

    const alive = () => voiceEntryActive && run === voiceRun;

    const lang = LANG_CODES[selectedLanguage] || "en-IN";


    const steps = [
        ["name", "speakName", "medicineName"],
        ["dosage", "speakDosage", "dosage"],
        ["time", "speakTime", "medicineTime"]
    ];


    for (const [step, promptKey, inputId] of steps) {

        let value = "";


        for (let attempt = 0; attempt < 3 && !value && alive(); attempt++) {

            voiceStep = step;

            updateVoiceStepUI();


            await speakAsync(getText(promptKey));

            if (!alive()) return;


            setVoiceStatus(getText("voiceListening"));


            let heard = "";

            try {

                const raw = await listenOnce(lang);

                heard = (raw || "").split(" | ")[0].trim();

            } catch (error) {

                console.log("Voice entry error:", error);

                if (!alive()) return;

                stopVoiceMedicineEntry();

                setVoiceStatus(getText("micDenied"));

                return;

            }

            if (!alive()) return;


            if (!heard) {

                setVoiceStatus(getText("noSpeech"));

                continue;

            }


            if (step === "time") {

                const converted = convertSpokenTime(heard);

                if (!converted) {

                    setVoiceStatus(getText("timeRetry"));

                    await speakAsync(getText("timeRetry"));

                    continue;

                }

                value = converted;

            } else {

                value = heard;

            }

        }


        if (!value) {

            stopVoiceMedicineEntry();

            setVoiceStatus(getText("noSpeech"));

            return;

        }


        const input = document.getElementById(inputId);

        if (input) input.value = value;

    }


    stopVoiceMedicineEntry();

    addMedicine();

}


// ============================================================
// CONVERT SPOKEN TIME
// ============================================================

function normalizeDigits(text) {

    // Devanagari, Tamil and Telugu digits -> 0-9
    const ranges = [0x0966, 0x0BE6, 0x0C66];

    return String(text).replace(/[\u0966-\u096F\u0BE6-\u0BEF\u0C66-\u0C6F]/g, function (ch) {

        const code = ch.charCodeAt(0);

        for (const start of ranges) {

            if (code >= start && code <= start + 9) {

                return String(code - start);

            }

        }

        return ch;

    });

}


function convertSpokenTime(raw) {

    if (!raw) return "";

    const text =
        normalizeDigits(raw.split(" | ")[0])
            .toLowerCase()
            .replace(/\./g, "")
            .trim();


    const match = text.match(/(\d{1,2})(?:\s*[:\s]\s*(\d{2}))?/);

    if (!match) return "";


    let hour = parseInt(match[1], 10);

    const minute = match[2] ? parseInt(match[2], 10) : 0;


    const pmLatin = /(^|[^a-z])pm($|[^a-z])|evening|night|afternoon/;
    const amLatin = /(^|[^a-z])am($|[^a-z])|morning/;

    const pmWords = /रात|शाम|दोपहर|இரவு|மாலை|மதியம்|రాత్రి|సాయంత్రం|మధ్యాహ్నం/;
    const amWords = /सुबह|காலை|ఉదయం/;

    const isPm = pmLatin.test(text) || pmWords.test(text);
    const isAm = amLatin.test(text) || amWords.test(text);


    if (isPm && hour < 12) hour += 12;

    if (isAm && !isPm && hour === 12) hour = 0;


    if (hour > 23 || minute > 59) return "";


    return (
        String(hour).padStart(2, "0") +
        ":" +
        String(minute).padStart(2, "0")
    );

}


// ============================================================
// VOICE UI
// ============================================================

function updateVoiceStepUI() {

    document
        .querySelectorAll(".voice-step")
        .forEach(step => step.classList.remove("active"));


    if (!voiceStep) return;


    const current =
        document.querySelector(`[data-step="${voiceStep}"]`);

    if (current) current.classList.add("active");

}


function setVoiceStatus(text) {

    const element = document.getElementById("voiceEntryStatus");

    if (element) element.textContent = text;

}


function stopVoiceMedicineEntry() {

    voiceEntryActive = false;

    voiceRun++;

    voiceStep = null;

    if (!activeReminder) {

        stopListening();

        stopSpeaking();

    }

    updateVoiceStepUI();

    setVoiceStatus(getText("voiceStopped"));

}


// ============================================================
// ENABLE VOICE (login screen button)
// ============================================================

async function enableMobileVoice() {

    unlockAudio();

    const status = document.getElementById("voiceStatus");

    const allowed = await ensureMicPermission();


    if (!allowed) {

        if (status) status.textContent = getText("micDenied");

        alert(getText("micDenied"));

    } else if (!canListen()) {

        // Speaking can still work; only listening is unavailable
        if (status) status.textContent = getText("voiceNotSupported");

    }


    speakText(getText("voiceEnabled"));

    if (allowed && canListen() && status) {

        status.textContent = getText("voiceEnabled");

    }

}


// ============================================================
// NATIVE SETUP + BACKGROUND NOTIFICATIONS (Capacitor)
// ============================================================

function notificationId(id) {

    let hash = 0;

    for (const ch of String(id)) {

        hash = (hash * 31 + ch.charCodeAt(0)) | 0;

    }

    return Math.abs(hash) % 2147483647 || 1;

}


async function setupNativeFeatures() {

    if (!isNative || nativeSetupDone) return;

    nativeSetupDone = true;


    const LN = plugin("LocalNotifications");

    if (LN) {

        try {

            await LN.requestPermissions();

            await LN.createChannel({
                id: "medicine-alarm",
                name: "Medicine reminders",
                description: "Daily medicine alarms",
                importance: 5,
                visibility: 1,
                vibration: true
            });

            // Tapping the notification opens the app, which then
            // starts the full voice reminder.
            LN.addListener("localNotificationActionPerformed", function () {

                checkReminders();

            });

        } catch (error) {

            console.log("Notification setup failed:", error);

        }

    }

    await ensureMicPermission();

}


// Re-creates one repeating daily alarm per medicine.
// These fire even when the app is closed or the screen is off.
async function syncNotifications() {

    const LN = plugin("LocalNotifications");

    if (!isNative || !LN) return;


    try {

        const pending = await LN.getPending();

        if (pending.notifications && pending.notifications.length) {

            await LN.cancel({
                notifications: pending.notifications.map(n => ({ id: n.id }))
            });

        }


        const notifications = medicines
            .filter(m => m.time)
            .map(m => {

                const parts = m.time.split(":").map(Number);

                return {
                    id: notificationId(m.id),
                    title: "💊 " + getText("reminderTitle"),
                    body: m.name + " - " + m.dosage + ". " + getText("reminder"),
                    channelId: "medicine-alarm",
                    schedule: {
                        on: { hour: parts[0], minute: parts[1] },
                        allowWhileIdle: true
                    },
                    extra: { medicineId: m.id }
                };

            });


        if (notifications.length) {

            await LN.schedule({ notifications });

        }

    } catch (error) {

        console.log("Notification sync failed:", error);

    }

}


// ============================================================
// CAREGIVER SAVE
// ============================================================

function saveCaregiver() {

    const input = document.getElementById("caregiverPhone");

    if (!input) return;

    const number = input.value.trim();

    if (!number) {

        alert(getText("noCaregiver"));

        return;

    }

    localStorage.setItem("jsMedicareCaregiver", number);

    alert(getText("caregiverSaved"));

}


// ============================================================
// CALL CAREGIVER
// ============================================================

function callCaregiver() {

    const number =
        localStorage.getItem("jsMedicareCaregiver") ||
        document.getElementById("caregiverPhone")?.value ||
        "";

    if (!number) {

        alert(getText("noCaregiver"));

        return;

    }

    window.location.href = "tel:" + number;

}


// ============================================================
// CALL AMBULANCE
// ============================================================

function callAmbulance() {

    window.location.href = "tel:108";

}


// ============================================================
// REGIONAL SMS
// ============================================================

function buildSmsMessage(medicine, language) {

    const name = String(medicine.name || "");
    const dosage = String(medicine.dosage || "");

    const templates = {

        en:
            "JS MEDICARE Alert: " + name + " (" + dosage + ") was missed. " +
            "Please check on the patient.",

        ta:
            "JS MEDICARE எச்சரிக்கை: " + name + " (" + dosage + ") மருந்து தவறிவிட்டது. " +
            "தயவுசெய்து நோயாளியை கவனிக்கவும்.",

        hi:
            "JS MEDICARE चेतावनी: " + name + " (" + dosage + ") दवा छूट गई है। " +
            "कृपया मरीज की जांच करें।",

        te:
            "JS MEDICARE హెచ్చరిక: " + name + " (" + dosage + ") మందు మిస్ అయింది. " +
            "దయచేసి రోగిని తనిఖీ చేయండి."

    };

    return templates[language] || templates.en;

}


async function sendCaregiverSMS(medicine) {

    // selectedLanguage is always the language the patient chose
    const language = getCurrentLanguage();

    const message = buildSmsMessage(medicine, language);


    console.log("SMS LANGUAGE:", language);
    console.log("SMS MESSAGE:", message);


    const caregiver =
        localStorage.getItem("jsMedicareCaregiver") ||
        document.getElementById("caregiverPhone")?.value ||
        "";

    if (!caregiver) {

        alert(getText("noCaregiver"));

        return;

    }


    // Option 1: automatic SMS through your own backend
    if (SMS_BACKEND_URL) {

        try {

            const response = await fetch(SMS_BACKEND_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ to: caregiver, message: message })
            });

            if (response.ok) return;

            console.log("SMS backend returned", response.status);

        } catch (error) {

            console.log("SMS backend failed:", error);

        }

    }


    // Option 2 (fallback): open the phone's SMS app with the text filled in
    window.location.href =
        "sms:" +
        encodeURIComponent(caregiver) +
        "?body=" +
        encodeURIComponent(message);

}


// ============================================================
// ACTIVITY LOG
// ============================================================

function logActivity(message) {

    const log = document.getElementById("activityLog");

    if (!log) return;

    const item = document.createElement("div");

    item.className = "activity-item";

    item.textContent =
        new Date().toLocaleTimeString() + " - " + message;

    log.prepend(item);

}


// ============================================================
// NEXT REMINDER
// ============================================================

function updateNextReminder() {

    const element = document.getElementById("nextReminder");

    if (!element) return;


    const pending = medicines
        .filter(m => m.status === "pending")
        .sort((a, b) => a.time.localeCompare(b.time));


    if (pending.length === 0) {

        element.textContent = "--";

        return;

    }


    element.textContent =
        pending[0].name + " - " + formatTime(pending[0].time);

}


// ============================================================
// MEDICATION REPORT
// ============================================================

function generateMedicationReport() {

    const rows = medicines
        .map(medicine => `

            <tr>
                <td>${escapeHTML(medicine.name)}</td>
                <td>${escapeHTML(medicine.dosage)}</td>
                <td>${formatTime(medicine.time)}</td>
                <td>${escapeHTML(statusText(medicine.status))}</td>
            </tr>

        `)
        .join("");


    const report = `

        <!DOCTYPE html>

        <html lang="${selectedLanguage}">

        <head>

            <meta charset="UTF-8">

            <title>JS MEDICARE - ${escapeHTML(getText("report"))}</title>

            <style>

                body {
                    font-family: Arial, sans-serif;
                    padding: 30px;
                }

                h1 {
                    text-align: center;
                    color: #087744;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }

                th,
                td {
                    border: 1px solid #999;
                    padding: 10px;
                    text-align: left;
                }

                th {
                    background: #eaf7f0;
                }

            </style>

        </head>

        <body>

            <h1>JS MEDICARE</h1>

            <h2>${escapeHTML(getText("report"))}</h2>

            <p>${escapeHTML(getText("patientName"))}: ${escapeHTML(patientName)}</p>

            <table>

                <thead>

                    <tr>
                        <th>${escapeHTML(getText("medicineName"))}</th>
                        <th>${escapeHTML(getText("dosage"))}</th>
                        <th>${escapeHTML(getText("time"))}</th>
                        <th>${escapeHTML(getText("status"))}</th>
                    </tr>

                </thead>

                <tbody>
                    ${rows}
                </tbody>

            </table>

        </body>

        </html>

    `;


    const reportWindow = window.open("", "_blank");

    if (!reportWindow) {

        alert(getText("popupBlocked"));

        return;

    }


    reportWindow.document.open();
    reportWindow.document.write(report);
    reportWindow.document.close();
    reportWindow.focus();


    setTimeout(function () {

        reportWindow.print();

    }, 500);

}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}
