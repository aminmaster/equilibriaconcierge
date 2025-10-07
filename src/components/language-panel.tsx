"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState, useMemo } from "react";

const LANGUAGES = [
  { code: "en", name: "English", native: "English" },
  { code: "es", name: "Spanish", native: "Español" },
  { code: "fr", name: "French", native: "Français" },
  { code: "de", name: "German", native: "Deutsch" },
  { code: "it", name: "Italian", native: "Italiano" },
  { code: "pt", name: "Portuguese", native: "Português" },
  { code: "ru", name: "Russian", native: "Русский" },
  { code: "zh", name: "Chinese", native: "中文" },
  { code: "ja", name: "Japanese", native: "日本語" },
  { code: "ko", name: "Korean", native: "한국어" },
  { code: "ar", name: "Arabic", native: "العربية" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "jv", name: "Javanese", native: "Basa Jawa" },
  { code: "te", name: "Telugu", native: "తెలుగు" },
  { code: "mr", name: "Marathi", native: "मराठी" },
  { code: "ta", name: "Tamil", native: "தமிழ்" },
  { code: "ur", name: "Urdu", native: "اردو" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml", name: "Malayalam", native: "മലയാളം" },
  { code: "or", name: "Odia", native: "ଓଡ଼ିଆ" },
  { code: "my", name: "Burmese", native: "မြန်မာဘာသာ" },
  { code: "sd", name: "Sindhi", native: "سنڌي" },
  { code: "am", name: "Amharic", native: "አማርኛ" },
  { code: "ha", name: "Hausa", native: "هَوُسَ" },
  { code: "yo", name: "Yoruba", native: "Èdè Yorùbá" },
  { code: "ig", name: "Igbo", native: "Asụsụ Igbo" },
  { code: "sw", name: "Swahili", native: "Kiswahili" },
  { code: "zu", name: "Zulu", native: "isiZulu" },
  { code: "xh", name: "Xhosa", native: "isiXhosa" },
  { code: "af", name: "Afrikaans", native: "Afrikaans" },
  { code: "nl", name: "Dutch", native: "Nederlands" },
  { code: "sv", name: "Swedish", native: "Svenska" },
  { code: "no", name: "Norwegian", native: "Norsk" },
  { code: "da", name: "Danish", native: "Dansk" },
  { code: "fi", name: "Finnish", native: "Suomi" },
  { code: "pl", name: "Polish", native: "Polski" },
  { code: "cs", name: "Czech", native: "Čeština" },
  { code: "sk", name: "Slovak", native: "Slovenčina" },
  { code: "hu", name: "Hungarian", native: "Magyar" },
  { code: "ro", name: "Romanian", native: "Română" },
  { code: "bg", name: "Bulgarian", native: "Български" },
  { code: "uk", name: "Ukrainian", native: "Українська" },
  { code: "hr", name: "Croatian", native: "Hrvatski" },
  { code: "sr", name: "Serbian", native: "Српски" },
  { code: "sl", name: "Slovenian", native: "Slovenščina" },
  { code: "et", name: "Estonian", native: "Eesti" },
  { code: "lv", name: "Latvian", native: "Latviešu" },
  { code: "lt", name: "Lithuanian", native: "Lietuvių" },
  { code: "mt", name: "Maltese", native: "Malti" },
  { code: "el", name: "Greek", native: "Ελληνικά" },
  { code: "tr", name: "Turkish", native: "Türkçe" },
  { code: "he", name: "Hebrew", native: "עברית" },
  { code: "fa", name: "Persian", native: "فارسی" },
  { code: "th", name: "Thai", native: "ไทย" },
  { code: "vi", name: "Vietnamese", native: "Tiếng Việt" },
  { code: "id", name: "Indonesian", native: "Bahasa Indonesia" },
  { code: "ms", name: "Malay", native: "Bahasa Melayu" },
  { code: "tl", name: "Filipino", native: "Filipino" },
  { code: "km", name: "Khmer", native: "ភាសាខ្មែរ" },
  { code: "lo", name: "Lao", native: "ພາສາລາວ" },
  { code: "mn", name: "Mongolian", native: "Монгол" },
  { code: "ne", name: "Nepali", native: "नेपाली" },
  { code: "si", name: "Sinhala", native: "සිංහල" },
  { code: "ka", name: "Georgian", native: "ქართული" },
  { code: "hy", name: "Armenian", native: "Հայերեն" },
  { code: "az", name: "Azerbaijani", native: "Azərbaycan dili" },
  { code: "uz", name: "Uzbek", native: "O'zbek" },
  { code: "kk", name: "Kazakh", native: "Қазақ тілі" },
  { code: "ky", name: "Kyrgyz", native: "Кыргызча" },
  { code: "tg", name: "Tajik", native: "Тоҷикӣ" },
  { code: "tk", name: "Turkmen", native: "Türkmen" },
  { code: "ps", name: "Pashto", native: "پښتو" },
  { code: "ku", name: "Kurdish", native: "کوردی" },
  { code: "ckb", name: "Sorani Kurdish", native: "کوردی سۆرانی" },
  { code: "sdh", name: "Southern Kurdish", native: "کوردی باشووری" },
  { code: "ug", name: "Uyghur", native: "ئۇيغۇرچە" },
  { code: "bo", name: "Tibetan", native: "བོད་སྐད་" },
  { code: "dz", name: "Dzongkha", native: "རྫོང་ཁ" },
  { code: "mi", name: "Maori", native: "Te Reo Māori" },
  { code: "haw", name: "Hawaiian", native: "ʻŌlelo Hawaiʻi" },
  { code: "sm", name: "Samoan", native: "Gagana Sāmoa" },
  { code: "to", name: "Tongan", native: "Lea faka-Tonga" },
  { code: "fj", name: "Fijian", native: "Na Vosa Vakaviti" },
  { code: "ty", name: "Tahitian", native: "Reo Tahiti" },
  { code: "mh", name: "Marshallese", native: "Kajin M̧ajeļ" },
  { code: "na", name: "Nauruan", native: "Dorerin Naoero" },
  { code: "nr", name: "Southern Ndebele", native: "isiNdebele seSewula" },
  { code: "nd", name: "Northern Ndebele", native: "isiNdebele saseNyakatho" },
  { code: "ve", name: "Venda", native: "Tshivenḓa" },
  { code: "ts", name: "Tsonga", native: "Xitsonga" },
  { code: "ss", name: "Swati", native: "SiSwati" },
  { code: "st", name: "Southern Sotho", native: "Sesotho sa Leboa" },
  { code: "tn", name: "Tswana", native: "Setswana" },
  { code: "ak", name: "Akan", native: "Akan" },
  { code: "bm", name: "Bambara", native: "Bamanankan" },
  { code: "ff", name: "Fula", native: "Fulfulde" },
  { code: "ki", name: "Kikuyu", native: "Gĩkũyũ" },
  { code: "lg", name: "Luganda", native: "Luganda" },
  { code: "ln", name: "Lingala", native: "Lingála" },
  { code: "lu", name: "Luba-Katanga", native: "Tshiluba" },
  { code: "ny", name: "Chichewa", native: "Chichewa" },
  { code: "om", name: "Oromo", native: "Afaan Oromoo" },
  { code: "rn", name: "Kirundi", native: "Ikirundi" },
  { code: "rw", name: "Kinyarwanda", native: "Ikinyarwanda" },
  { code: "sn", name: "Shona", native: "ChiShona" },
  { code: "so", name: "Somali", native: "Soomaali" },
  { code: "ti", name: "Tigrinya", native: "ትግርኛ" },
  { code: "tum", name: "Tumbuka", native: "ChiTumbuka" },
  { code: "wo", name: "Wolof", native: "Wolof" },
  { code: "xog", name: "Soga", native: "Olusoga" },
  { code: "asa", name: "Asu", native: "Kipare" },
  { code: "bez", name: "Bena", native: "Ekibena" },
  { code: "bem", name: "Bemba", native: "Ichibemba" },
  { code: "brx", name: "Bodo", native: "बड़ो" },
  { code: "chr", name: "Cherokee", native: "ᏣᎳᎩ" },
  { code: "cgg", name: "Chiga", native: "Rukiga" },
  { code: "dav", name: "Taita", native: "Kitaita" },
  { code: "dua", name: "Duala", native: "Duala" },
  { code: "dyo", name: "Jola-Fonyi", native: "Joola" },
  { code: "ebu", name: "Embu", native: "Kĩembu" },
  { code: "ee", name: "Ewe", native: "Eʋegbe" },
  { code: "fil", name: "Filipino", native: "Filipino" },
  { code: "fur", name: "Friulian", native: "Furlan" },
  { code: "gsw", name: "Swiss German", native: "Schwiizertüütsch" },
  { code: "guz", name: "Gusii", native: "Ekegusii" },
  { code: "hak", name: "Hakka Chinese", native: "客家话" },
  { code: "haw", name: "Hawaiian", native: "ʻŌlelo Hawaiʻi" },
  { code: "ii", name: "Sichuan Yi", native: "ꆈꌠꉙ" },
  { code: "jgo", name: "Ngomba", native: "Ndaꞌa" },
  { code: "jmc", name: "Machame", native: "Kimachame" },
  { code: "kab", name: "Kabyle", native: "Taqbaylit" },
  { code: "kam", name: "Kamba", native: "Kikamba" },
  { code: "kde", name: "Makonde", native: "Chimakonde" },
  { code: "kea", name: "Kabuverdianu", native: "Kabuverdianu" },
  { code: "khq", name: "Koyra Chiini", native: "Koyra ciini" },
  { code: "ki", name: "Kikuyu", native: "Gĩkũyũ" },
  { code: "kln", name: "Kalenjin", native: "Kalenjin" },
  { code: "kok", name: "Konkani", native: "कोंकणी" },
  { code: "ks", name: "Kashmiri", native: "कॉशुर / کٲشُر" },
  { code: "ksb", name: "Shambala", native: "Kishambaa" },
  { code: "ksf", name: "Bafia", native: "Rikpa" },
  { code: "ksh", name: "Colognian", native: "Kölsch" },
  { code: "lag", name: "Langi", native: "Kɨlaangi" },
  { code: "lb", name: "Luxembourgish", native: "Lëtzebuergesch" },
  { code: "lkt", name: "Lakota", native: "Lakȟótiyapi" },
  { code: "lrc", name: "Northern Luri", native: "لۊری شومالی" },
  { code: "luo", name: "Luo", native: "Dholuo" },
  { code: "luy", name: "Luyia", native: "Luluhia" },
  { code: "mas", name: "Masai", native: "Ɔl-Maa" },
  { code: "mer", name: "Meru", native: "Kĩmĩrũ" },
  { code: "mfe", name: "Morisyen", native: "Kreol morisien" },
  { code: "mgh", name: "Makhuwa-Meetto", native: "Makua" },
  { code: "mgo", name: "Metaʼ", native: "Metaʼ" },
  { code: "mua", name: "Mundang", native: "Mundang" },
  { code: "nmg", name: "Kwasio", native: "Kwasio" },
  { code: "nnh", name: "Ngiemboon", native: "Shwóŋò ngiembɔɔn" },
  { code: "nus", name: "Nuer", native: "Thok Nath" },
  { code: "nyn", name: "Nyankole", native: "Runyankore" },
  { code: "pap", name: "Papiamento", native: "Papiamentu" },
  { code: "prg", name: "Prussian", native: "Prūsiskan" },
  { code: "qu", name: "Quechua", native: "Runasimi" },
  { code: "rof", name: "Rombo", native: "Kirombo" },
  { code: "rwk", name: "Rwa", native: "Kiruwa" },
  { code: "sah", name: "Sakha", native: "Саха тыла" },
  { code: "saq", name: "Samburu", native: "Sampur" },
  { code: "sbp", name: "Sangu", native: "Ishisangu" },
  { code: "seh", name: "Sena", native: "Sena" },
  { code: "ses", name: "Koyraboro Senni", native: "Koyraboro senni" },
  { code: "sg", name: "Sango", native: "Yângâ tî sängö" },
  { code: "shi", name: "Tachelhit", native: "ⵜⴰⵛⵍⵃⵉⵜ" },
  { code: "sl", name: "Slovenian", native: "Slovenščina" },
  { code: "smn", name: "Inari Sami", native: "Anarâškielâ" },
  { code: "sq", name: "Albanian", native: "Shqip" },
  { code: "srn", name: "Sranan Tongo", native: "Sranang Tongo" },
  { code: "ssy", name: "Saho", native: "Saho" },
  { code: "teo", name: "Teso", native: "Kiteso" },
  { code: "twq", name: "Tasawaq", native: "Tasawaq senni" },
  { code: "vai", name: "Vai", native: "ꕙꔤ" },
  { code: "vun", name: "Vunjo", native: "Kyivunjo" },
  { code: "wae", name: "Walser", native: "Walser" },
  { code: "xog", name: "Soga", native: "Olusoga" },
  { code: "yav", name: "Yangben", native: "Nuasue" },
  { code: "yue", name: "Cantonese", native: "粵語" },
  { code: "zgh", name: "Standard Moroccan Tamazight", native: "ⵜⴰⵎⴰⵣⵉⵖⵜ" }
];

interface LanguagePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LanguagePanel({ open, onOpenChange }: LanguagePanelProps) {
  const currentLanguage = "en"; // In a real app, this would come from context/state
  const [searchTerm, setSearchTerm] = useState("");

  const filteredLanguages = useMemo(() => {
    if (!searchTerm) return LANGUAGES;
    const term = searchTerm.toLowerCase();
    return LANGUAGES.filter(lang => 
      lang.name.toLowerCase().includes(term) || 
      lang.native.toLowerCase().includes(term) ||
      lang.code.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Language</DialogTitle>
          <DialogDescription>
            Select your preferred language
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search languages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              aria-label="Search languages"
            />
          </div>
        </div>
        <ScrollArea className="h-72">
          <div className="space-y-2">
            {filteredLanguages.map((language) => (
              <Button
                key={language.code}
                variant={currentLanguage === language.code ? "default" : "ghost"}
                className="w-full justify-between"
                onClick={() => {
                  // In a real app, this would set the language
                  onOpenChange(false);
                }}
              >
                <span>{language.name}</span>
                <span className="text-muted-foreground">{language.native}</span>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}