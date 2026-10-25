export type KanaScript = "hiragana" | "katakana";
export type ScriptSelection = KanaScript | "both";
export type KanaGroup = "basic" | "dakuten" | "yoon" | "extended";
export type KanaRow = "vowel" | "k" | "s" | "t" | "n" | "h" | "m" | "y" | "r" | "w" | "n-sound" | "g" | "z" | "d" | "b" | "p" | "ky" | "sh" | "ch" | "ny" | "hy" | "my" | "ry" | "gy" | "j" | "by" | "py" | "fa" | "ti" | "we" | "she-je-che" | "vu" | "tsa" | "ye" | "kwa";

export interface KanaCharacter { id: string; char: string; script: KanaScript; group: KanaGroup; row: KanaRow; romaji: string[]; }
export interface RowMetadata { key: string; group: KanaGroup; row: KanaRow; romajiLabel: string; label: { hiragana: string; katakana: string }; sample: { hiragana: string; katakana: string }; }
export interface CharacterFilter { script: ScriptSelection; rowKeys: string[]; characterIds?: string[]; }

export const rowMetadata: RowMetadata[] = [];
export const groupRows: Record<KanaGroup, RowMetadata[]> = { basic: [], dakuten: [], yoon: [], extended: [] };

function addRows(group: KanaGroup, rows: Array<[KanaRow, string, string, string, string, string?]>) {
  for (const [row, romajiLabel, hiraLabel, kataLabel, hiraSample, kataSample] of rows) {
    const metadata: RowMetadata = { key: `${group}:${row}`, group, row, romajiLabel, label: { hiragana: hiraLabel, katakana: kataLabel }, sample: { hiragana: hiraSample, katakana: kataSample ?? hiraSample } };
    rowMetadata.push(metadata); groupRows[group].push(metadata);
  }
}

addRows("basic", [["vowel","A","あ段","ア段","あ","ア"],["k","KA","か行","カ行","か","カ"],["s","SA","さ行","サ行","さ","サ"],["t","TA","た行","タ行","た","タ"],["n","NA","な行","ナ行","な","ナ"],["h","HA","は行","ハ行","は","ハ"],["m","MA","ま行","マ行","ま","マ"],["y","YA","や行","ヤ行","や","ヤ"],["r","RA","ら行","ラ行","ら","ラ"],["w","WA","わ行","ワ行","わ","ワ"],["n-sound","N","ん","ン","ん","ン"]]);
addRows("dakuten", [["g","GA","が行","ガ行","が","ガ"],["z","ZA","ざ行","ザ行","ざ","ザ"],["d","DA","だ行","ダ行","だ","ダ"],["b","BA","ば行","バ行","ば","バ"],["p","PA","ぱ行","パ行","ぱ","パ"]]);
addRows("yoon", [["ky","KYA","きゃ行","キャ行","きゃ","キャ"],["sh","SHA","しゃ行","シャ行","しゃ","シャ"],["ch","CHA","ちゃ行","チャ行","ちゃ","チャ"],["ny","NYA","にゃ行","ニャ行","にゃ","ニャ"],["hy","HYA","ひゃ行","ヒャ行","ひゃ","ヒャ"],["my","MYA","みゃ行","ミャ行","みゃ","ミャ"],["ry","RYA","りゃ行","リャ行","りゃ","リャ"],["gy","GYA","ぎゃ行","ギャ行","ぎゃ","ギャ"],["j","JA","じゃ行","ジャ行","じゃ","ジャ"],["by","BYA","びゃ行","ビャ行","びゃ","ビャ"],["py","PYA","ぴゃ行","ピャ行","ぴゃ","ピャ"]]);
addRows("extended", [["fa","FA","","ファ・フォ","ファ","ファ"],["ti","TI/TU","","ティ・トゥ","ティ","ティ"],["we","WI/WE","","ウィ・ウォ","ウィ","ウィ"],["she-je-che","SHE/JE","","シェ・チェ","シェ","シェ"],["vu","VU","","ヴァ・ヴォ","ヴァ","ヴァ"],["tsa","TSA","","ツァ・ツォ","ツァ","ツァ"],["ye","YE","","イェ","イェ","イェ"],["kwa","KW","","クァ・クォ","クァ","クァ"]]);

export const kanaCharacters: KanaCharacter[] = [];
const basic = [
  ["vowel", ["a","i","u","e","o"], ["あ","い","う","え","お"], ["ア","イ","ウ","エ","オ"]], ["k", ["ka","ki","ku","ke","ko"], ["か","き","く","け","こ"], ["カ","キ","ク","ケ","コ"]],
  ["s", ["sa","shi","su","se","so"], ["さ","し","す","せ","そ"], ["サ","シ","ス","セ","ソ"]], ["t", ["ta","chi","tsu","te","to"], ["た","ち","つ","て","と"], ["タ","チ","ツ","テ","ト"]],
  ["n", ["na","ni","nu","ne","no"], ["な","に","ぬ","ね","の"], ["ナ","ニ","ヌ","ネ","ノ"]], ["h", ["ha","hi","fu","he","ho"], ["は","ひ","ふ","へ","ほ"], ["ハ","ヒ","フ","ヘ","ホ"]],
  ["m", ["ma","mi","mu","me","mo"], ["ま","み","む","め","も"], ["マ","ミ","ム","メ","モ"]], ["y", ["ya","yu","yo"], ["や","ゆ","よ"], ["ヤ","ユ","ヨ"]],
  ["r", ["ra","ri","ru","re","ro"], ["ら","り","る","れ","ろ"], ["ラ","リ","ル","レ","ロ"]], ["w", ["wa","wo"], ["わ","を"], ["ワ","ヲ"]],
] as const;

for (const script of ["hiragana", "katakana"] as const) {
  for (const [row, sounds, hira, kata] of basic) {
    sounds.forEach((sound, index) => { const char = script === "hiragana" ? hira[index] : kata[index]; if (char) kanaCharacters.push({ id: `${script}-${char}`, char, script, group: "basic", row: row as KanaRow, romaji: sound === "shi" ? ["shi","si"] : sound === "chi" ? ["chi","ti"] : sound === "tsu" ? ["tsu","tu"] : sound === "fu" ? ["fu","hu"] : sound === "wo" ? ["wo","o"] : [sound] }); });
  }
  kanaCharacters.push({ id: `${script}-${script === "hiragana" ? "ん" : "ン"}`, char: script === "hiragana" ? "ん" : "ン", script, group: "basic", row: "n-sound", romaji: ["n","nn"] });
}

const dakuten: Array<{ row: KanaRow; sounds: string[] }> = [
  { row: "g", sounds: ["ga","gi","gu","ge","go"] }, { row: "z", sounds: ["za","ji","zu","ze","zo"] }, { row: "d", sounds: ["da","ji","zu","de","do"] }, { row: "b", sounds: ["ba","bi","bu","be","bo"] }, { row: "p", sounds: ["pa","pi","pu","pe","po"] },
];
for (const script of ["hiragana", "katakana"] as const) {
  for (const { row, sounds } of dakuten) {
    sounds.forEach((sound, index) => { const chars = script === "hiragana" ? ({g:["が","ぎ","ぐ","げ","ご"],z:["ざ","じ","ず","ぜ","ぞ"],d:["だ","ぢ","づ","で","ど"],b:["ば","び","ぶ","べ","ぼ"],p:["ぱ","ぴ","ぷ","ぺ","ぽ"]} as Record<string,string[]>)[row] : ({g:["ガ","ギ","グ","ゲ","ゴ"],z:["ザ","ジ","ズ","ゼ","ゾ"],d:["ダ","ヂ","ヅ","デ","ド"],b:["バ","ビ","ブ","ベ","ボ"],p:["パ","ピ","プ","ペ","ポ"]} as Record<string,string[]>)[row]; const char = chars[index]; let romaji = [sound]; if (row === "z" && index === 1) romaji=["ji","zi"]; if (row === "d" && index === 1) romaji=["ji","di"]; if (row === "d" && index === 2) romaji=["zu","du"]; kanaCharacters.push({ id: `${script}-${char}`, char, script, group: "dakuten", row, romaji }); });
  }
}

const yoon = [["ky",["kya","kyu","kyo"]],["sh",["sha","shu","sho"]],["ch",["cha","chu","cho"]],["ny",["nya","nyu","nyo"]],["hy",["hya","hyu","hyo"]],["my",["mya","myu","myo"]],["ry",["rya","ryu","ryo"]],["gy",["gya","gyu","gyo"]],["j",["ja","ju","jo"]],["by",["bya","byu","byo"]],["py",["pya","pyu","pyo"]]] as const;
for (const script of ["hiragana","katakana"] as const) {
  for (const [row,sounds] of yoon) {
    sounds.forEach((sound,index) => { const hiraMap={ky:["きゃ","きゅ","きょ"],sh:["しゃ","しゅ","しょ"],ch:["ちゃ","ちゅ","ちょ"],ny:["にゃ","にゅ","にょ"],hy:["ひゃ","ひゅ","ひょ"],my:["みゃ","みゅ","みょ"],ry:["りゃ","りゅ","りょ"],gy:["ぎゃ","ぎゅ","ぎょ"],j:["じゃ","じゅ","じょ"],by:["びゃ","びゅ","びょ"],py:["ぴゃ","ぴゅ","ぴょ"]} as Record<string,string[]>; const kataMap={ky:["キャ","キュ","キョ"],sh:["シャ","シュ","ショ"],ch:["チャ","チュ","チョ"],ny:["ニャ","ニュ","ニョ"],hy:["ヒャ","ヒュ","ヒョ"],my:["ミャ","ミュ","ミョ"],ry:["リャ","リュ","リョ"],gy:["ギャ","ギュ","ギョ"],j:["ジャ","ジュ","ジョ"],by:["ビャ","ビュ","ビョ"],py:["ピャ","ピュ","ピョ"]} as Record<string,string[]>; const char=(script=== "hiragana"?hiraMap[row]:kataMap[row])[index]; const variants: Record<string,string[]>={sha:["sha","sya"],shu:["shu","syu"],sho:["sho","syo"],cha:["cha","tya"],chu:["chu","tyu"],cho:["cho","tyo"],ja:["ja","zya","jya"],ju:["ju","zyu","jyu"],jo:["jo","zyo","jyo"]}; kanaCharacters.push({id:`${script}-${char}`,char,script,group:"yoon",row:row as KanaRow,romaji:variants[sound]??[sound]}); });
  }
}

const extended: Array<{row:KanaRow;char:string;romaji:string[]}> = [
  {row:"fa",char:"ファ",romaji:["fa","fwa"]},{row:"fa",char:"フィ",romaji:["fi","hwi"]},{row:"fa",char:"フェ",romaji:["fe","hwe"]},{row:"fa",char:"フォ",romaji:["fo","hwo"]},
  {row:"ti",char:"ティ",romaji:["ti","thi"]},{row:"ti",char:"トゥ",romaji:["tu","twu"]},{row:"ti",char:"ディ",romaji:["di","dhi"]},{row:"ti",char:"ドゥ",romaji:["du","dwu"]},{row:"ti",char:"デュ",romaji:["dyu","dhu"]},
  {row:"we",char:"ウィ",romaji:["wi","whi"]},{row:"we",char:"ウェ",romaji:["we","whe"]},{row:"we",char:"ウォ",romaji:["wo","who"]},
  {row:"she-je-che",char:"シェ",romaji:["she","sye"]},{row:"she-je-che",char:"ジェ",romaji:["je","zye","jye"]},{row:"she-je-che",char:"チェ",romaji:["che","tye","cye"]},
  {row:"vu",char:"ヴァ",romaji:["va"]},{row:"vu",char:"ヴィ",romaji:["vi"]},{row:"vu",char:"ヴ",romaji:["vu"]},{row:"vu",char:"ヴェ",romaji:["ve"]},{row:"vu",char:"ヴォ",romaji:["vo"]},
  {row:"tsa",char:"ツァ",romaji:["tsa"]},{row:"tsa",char:"ツィ",romaji:["tsi"]},{row:"tsa",char:"ツェ",romaji:["tse"]},{row:"tsa",char:"ツォ",romaji:["tso"]},{row:"ye",char:"イェ",romaji:["ye"]},
  {row:"kwa",char:"クァ",romaji:["kwa"]},{row:"kwa",char:"クィ",romaji:["kwi"]},{row:"kwa",char:"クェ",romaji:["kwe"]},{row:"kwa",char:"クォ",romaji:["kwo"]},
];
for (const item of extended) kanaCharacters.push({ id: `katakana-${item.char}`, char: item.char, script: "katakana", group: "extended", row: item.row, romaji: item.romaji });

export function getCharacters(filter: CharacterFilter): KanaCharacter[] {
  if (filter.characterIds?.length) { const ids=new Set(filter.characterIds); return kanaCharacters.filter((item) => ids.has(item.id)); }
  const rowKeys=new Set(filter.rowKeys); return kanaCharacters.filter((item) => (filter.script === "both" || item.script === filter.script) && (item.group === "extended" ? filter.script !== "hiragana" && rowKeys.has(`extended:${item.row}`) : rowKeys.has(`${item.group}:${item.row}`)));
}
export function countCharacters(filter: CharacterFilter): number { return getCharacters(filter).length; }
