/**
 * NigWrite - Grammar & Mechanics Checker (E-rater Style)
 * Task ID: 2b
 *
 * A comprehensive rule-based grammar checker that detects:
 *   1. Subject-verb agreement errors
 *   2. Article usage (missing articles before countable nouns)
 *   3. Verb tense consistency
 *   4. Spelling errors (100+ common misspellings)
 *   5. Passive voice patterns
 *   6. Wordiness (verbose phrases → concise alternatives)
 *   7. Sentence fragments
 *   8. Run-on sentences (>40 words without proper conjunctions)
 *   9. Double negatives
 *   10. Commonly confused words
 */

// ═══════════════════════════════════════════════════════════════
// Interfaces
// ═══════════════════════════════════════════════════════════════

export interface GrammarIssue {
  type: 'grammar' | 'spelling' | 'style' | 'mechanics';
  category: string;
  message: string;
  suggestion: string;
  position: { start: number; end: number };
  originalText: string;
  severity: 'error' | 'warning' | 'info';
}

export interface GrammarResult {
  issues: GrammarIssue[];
  score: number; // 0-100 (higher = better grammar)
  statistics: {
    totalIssues: number;
    errors: number;
    warnings: number;
    info: number;
    categories: { category: string; count: number }[];
  };
}

// ═══════════════════════════════════════════════════════════════
// 1. Spelling Dictionary (100+ common misspellings)
// ═══════════════════════════════════════════════════════════════

const COMMON_MISSPELLINGS: Record<string, string> = {
  'accomodate': 'accommodate',
  'acheive': 'achieve',
  'acknowlege': 'acknowledge',
  'aquire': 'acquire',
  'alright': 'all right',
  'amature': 'amateur',
  'apparant': 'apparent',
  'apparantly': 'apparently',
  'arguement': 'argument',
  'assasinate': 'assassinate',
  'awfull': 'awful',
  'baloon': 'balloon',
  'barbecue': 'barbecue',
  'begining': 'beginning',
  'believe': 'believe',
  'beggining': 'beginning',
  'beautifull': 'beautiful',
  'beacuse': 'because',
  'becuase': 'because',
  'calender': 'calendar',
  'camoflage': 'camouflage',
  'carribean': 'Caribbean',
  'catagory': 'category',
  'cemetary': 'cemetery',
  'changeable': 'changeable',
  'collegue': 'colleague',
  'commited': 'committed',
  'concious': 'conscious',
  'curiousity': 'curiosity',
  'definately': 'definitely',
  'definetely': 'definitely',
  'definatley': 'definitely',
  'desparate': 'desperate',
  'desparately': 'desperately',
  'dilemna': 'dilemma',
  'dissapear': 'disappear',
  'dissapoint': 'disappoint',
  'embarass': 'embarrass',
  'embarassment': 'embarrassment',
  'enviroment': 'environment',
  'existance': 'existence',
  'experiance': 'experience',
  'expirience': 'experience',
  'facinate': 'fascinate',
  'febuary': 'February',
  'freind': 'friend',
  'fulfil': 'fulfill',
  'gaurd': 'guard',
  'goverment': 'government',
  'grammer': 'grammar',
  'happend': 'happened',
  'harasment': 'harassment',
  'heighth': 'height',
  'harrass': 'harass',
  'hierachy': 'hierarchy',
  'hygeine': 'hygiene',
  'ignorence': 'ignorance',
  'immediatly': 'immediately',
  'independant': 'independent',
  'incidently': 'incidentally',
  'innoculate': 'inoculate',
  'intelligance': 'intelligence',
  'irresistable': 'irresistible',
  'judgement': 'judgment',
  'kernal': 'kernel',
  'lieing': 'lying',
  'libary': 'library',
  'maintainance': 'maintenance',
  'manuever': 'maneuver',
  'medeval': 'medieval',
  'memento': 'memento',
  'millenium': 'millennium',
  'mischievious': 'mischievous',
  'neccessary': 'necessary',
  'necesary': 'necessary',
  'neice': 'niece',
  'noticable': 'noticeable',
  'occassion': 'occasion',
  'occasionally': 'occasionally',
  'occurence': 'occurrence',
  'occurred': 'occurred',
  'occured': 'occurred',
  'oportunity': 'opportunity',
  'paralel': 'parallel',
  'persistant': 'persistent',
  'pharoah': 'pharaoh',
  'playwrite': 'playwright',
  'posession': 'possession',
  'potatos': 'potatoes',
  'practicle': 'practical',
  'privelege': 'privilege',
  'probly': 'probably',
  'professer': 'professor',
  'pronounciation': 'pronunciation',
  'publically': 'publicly',
  'questionaire': 'questionnaire',
  'realy': 'really',
  'reccomend': 'recommend',
  'reconize': 'recognize',
  'relevent': 'relevant',
  'religous': 'religious',
  'rember': 'remember',
  'repitition': 'repetition',
  'resistence': 'resistance',
  'responsable': 'responsible',
  'rythm': 'rhythm',
  'sacrilegious': 'sacrilegious',
  'seize': 'seize',
  'seperate': 'separate',
  'sieze': 'seize',
  'similarily': 'similarly',
  'speach': 'speech',
  'strenght': 'strength',
  'succede': 'succeed',
  'successfull': 'successful',
  'suprise': 'surprise',
  'tommorow': 'tomorrow',
  'tomorow': 'tomorrow',
  'tommorrow': 'tomorrow',
  'tounge': 'tongue',
  'truley': 'truly',
  'tyrany': 'tyranny',
  'unfortunatly': 'unfortunately',
  'untill': 'until',
  'usefull': 'useful',
  'vaccuum': 'vacuum',
  'vegatable': 'vegetable',
  'villian': 'villain',
  'wierd': 'weird',
  'writting': 'writing',
  'underate': 'underrate',
  'wether': 'whether',
  'wich': 'which',
  'recieve': 'receive',
  'occurrance': 'occurrence',
  'adress': 'address',
  'priviledge': 'privilege',
  'occassionally': 'occasionally',
  'accomodation': 'accommodation',
  'writen': 'written',
  'immedately': 'immediately',
  'recomend': 'recommend',
  'refered': 'referred',
  'refrence': 'reference',
  'sufficent': 'sufficient',
  'transfered': 'transferred',
  'unusal': 'unusual',
  'usally': 'usually'
};

// ═══════════════════════════════════════════════════════════════
// 2. Commonly Confused Words
// ═══════════════════════════════════════════════════════════════

interface ConfusedWordEntry {
  pattern: RegExp;
  message: string;
  suggestion: string;
  category: string;
}

const CONFUSED_WORDS_RULES: ConfusedWordEntry[] = [
  // affect vs effect
  {
    pattern: /\b(affects?|affected|affecting)\s+(the\s+)?(overall|final|total|general|end|ultimate|positive|negative|desired|intended|expected)\s+(result|outcome|effect|impact|consequence)/i,
    message: '"Affect" is usually a verb meaning "to influence". Did you mean "effect" (the noun)?',
    suggestion: 'Consider using "effect" (noun) instead of "affect" here.',
    category: 'commonly-confused-words',
  },
  {
    pattern: /\bhave\s+an?\s+effect\s+(on|upon)\b/i,
    message: 'This is correct usage: "have an effect on" (noun form).',
    suggestion: 'Correct — "effect" is the noun meaning "result".',
    category: 'commonly-confused-words',
  },
  {
    pattern: /\beffected\b(?!\s+by)/i,
    message: 'Did you mean "affected"? "Effected" means "brought about" (e.g., "effected change").',
    suggestion: 'Use "affected" if you mean "influenced or changed".',
    category: 'commonly-confused-words',
  },
  // their / there / they're
  {
    pattern: /\b(they|they\'re|there)\s+(going|went|are|were|have|had|will|would|should|could|might|can|do|did|aren\'t|isn\'t|wasn\'t|weren\'t|haven\'t|hasn\'t)\b(?!\s+(is|are|was|were|going|a|the|some|any|no|not|here|there|very|so|too|quite|really|just|also|more|less|most|least|about|almost|already|still|even|only|now|then|always|never|often|sometimes|usually)\b)/i,
    message: 'Consider whether "they\'re" (they are) is more appropriate than "their" or "there".',
    suggestion: 'Use "they\'re" for "they are", "their" for possession, "there" for location.',
    category: 'commonly-confused-words',
  },
  {
    pattern: /\b(its)\s+(is|are|was|were|been|being|going|not)\b/i,
    message: '"Its" is possessive. Did you mean "it\'s" (it is)?',
    suggestion: 'Use "it\'s" (it is / it has) or "its" (belonging to it).',
    category: 'commonly-confused-words',
  },
  {
    pattern: /\b(your)\s+(is|are|was|were|been|being|going|not|a|the|very|so|too|really|just|about|almost|already|still|even|only|now|then)\b/i,
    message: '"Your" is possessive. Did you mean "you\'re" (you are)?',
    suggestion: 'Use "you\'re" (you are) or "your" (belonging to you).',
    category: 'commonly-confused-words',
  },
  // then / than
  {
    pattern: /\bmore\s+(better|worse|larger|smaller|important|significant|likely|often|frequent|common|clear|obvious|difficult|easy|hard|fast|slow|high|low|big|small|old|new|young|long|short)\s+then\b/i,
    message: 'Use "than" for comparisons, not "then".',
    suggestion: '"Than" is used for comparisons; "then" indicates time or sequence.',
    category: 'commonly-confused-words',
  },
  // lose / loose
  {
    pattern: /\bloose\s+(weight|money|the\s+game|their\s+job|his\s+job|her\s+job|your\s+job|a\s+match|the\s+race|the\s+war|the\s+battle|sight|focus|control|grip|balance|interest|hope|faith|patience)\b/i,
    message: 'Did you mean "lose"? "Loose" means not tight.',
    suggestion: 'Use "lose" (to fail to keep); "loose" means not firmly fixed.',
    category: 'commonly-confused-words',
  },
  // its / it's
  {
    pattern: /\bit's\s+(own|way|best|worst|name|title|role|job|place|part|share|turn|time|value|worth|size|shape|color|form|nature|kind|type|purpose|function|goal|aim|end|use|power|strength|ability|capacity)\b/i,
    message: 'Possessive "its" does not take an apostrophe.',
    suggestion: 'Use "its" (no apostrophe) for the possessive form.',
    category: 'commonly-confused-words',
  },
  // principal / principle
  {
    pattern: /\bprincipal\b/i,
    message: 'Verify: "principal" means main/primary (person or thing); "principle" means a rule or belief.',
    suggestion: 'Use "principal" for main/head; "principle" for fundamental truth/belief.',
    category: 'commonly-confused-words',
  },
  // compliment / complement
  {
    pattern: /\bcompliment\b(?!\s+(on|about|for))/i,
    message: 'Verify: "compliment" = praise; "complement" = to complete or enhance.',
    suggestion: 'Use "compliment" for praise; "complement" when something completes another.',
    category: 'commonly-confused-words',
  },
  // who's / whose
  {
    pattern: /\bwho's\s+(is|are|was|were|been|being|going|not|a|the|very|so|too|really|just|about|almost|already|still|even|only|now|then)\b/i,
    message: '"Who\'s" already means "who is". This appears redundant.',
    suggestion: 'Use "whose" (possessive) or rephrase to avoid "who\'s is".',
    category: 'commonly-confused-words',
  },
];

// ═══════════════════════════════════════════════════════════════
// 3. Subject-Verb Agreement
// ═══════════════════════════════════════════════════════════════

interface SVARule {
  pattern: RegExp;
  message: string;
  suggestion: string;
}

const SVA_RULES: SVARule[] = [
  // Singular subjects with plural verbs
  { pattern: /\b(he|she|it)\s+(go|have|do|is|are|was|were|come|take|make|give|say|know|think|get|find|tell|ask|work|seem|feel|try|leave|call|keep|let|begin|show|hear|play|run|move|live|believe|bring|happen|write|provide|sit|stand|lose|pay|meet|include|continue|set|learn|change|lead|understand|watch|follow|stop|create|speak|read|allow|add|spend|grow|open|walk|win|offer|remember|love|consider|appear|buy|wait|serve|die|send|expect|build|stay|fall|cut|reach|kill|remain)\b(?!\s+(?:up|in|out|off|on|away|back|down|over|together|ahead|apart|aside|behind|beside|beyond|forward|into|near|through|under|upon|with))\b(?!ing\b)/i,
    message: 'Possible subject-verb agreement error with a third-person singular subject.',
    suggestion: 'Ensure the verb has the correct "-s" or "-es" ending for third-person singular subjects (he/she/it).',
  },
  { pattern: /\b(he|she|it)\s+(don't)\b/i,
    message: '"Don\'t" should be "doesn\'t" with third-person singular subjects.',
    suggestion: 'Use "doesn\'t" instead of "don\'t" with he/she/it.',
  },
  { pattern: /\b(everyone|everybody|someone|somebody|anyone|anybody|no one|nobody|everything|something|anything|nothing|each|either|neither)\s+(are|were|have|don't|aren't|were|were've|'ve)\b/i,
    message: 'Indefinite pronouns take singular verbs.',
    suggestion: 'Use singular verb forms (is, was, has, doesn\'t) with these pronouns.',
  },
  { pattern: /\bthe\s+(group|team|committee|family|staff|audience|class|company|government|jury|majority|minority|public)\s+(are|were|have|don't|aren't)\b(?!s)/i,
    message: 'Collective nouns usually take singular verbs in American English.',
    suggestion: 'Consider using a singular verb (is, was, has) unless referring to individuals acting separately.',
  },
  // Plural subjects with singular verbs
  { pattern: /\b(they|we|students|researchers|authors|scientists|doctors|teachers|people|children|men|women|workers|employees|managers|leaders|politicians)\s+(is)\s+(?!a\b|not\b|being\b|there\b)/i,
    message: 'Plural subjects require plural verbs. "Is" is singular.',
    suggestion: 'Use "are" instead of "is" with plural subjects.',
  },
  // "There is/are" agreement
  { pattern: /\bthere\s+(is)\s+(several|many|multiple|various|numerous|different|few|two|three|four|five|six|seven|eight|nine|ten)\b/i,
    message: '"There is" should be "there are" with plural complements.',
    suggestion: 'Use "there are" when followed by plural nouns or quantifiers.',
  },
  // Noun phrase agreement
  { pattern: /\bone\s+of\s+the\s+\w+\s+(is|was|has)\s+(?!the\b|a\b|an\b|not\b|being\b|very\b|quite\b|rather\b|somewhat\b|extremely\b|incredibly\b|highly\b)/i,
    message: '"One of the [plural noun]" should take a plural verb.',
    suggestion: 'Use a plural verb: "One of the students is" → "One of the students are" is correct in formal usage, but consider rephrasing.',
  },
];

// ═══════════════════════════════════════════════════════════════
// 4. Article Usage
// ═══════════════════════════════════════════════════════════════

const ARTICLE_RULES = [
  {
    pattern: /\b(is|was|became|becomes|remained|remains|proved|proves|appeared|appears|seemed|seems)\s+(a|an)\s+([aeiou]\w*)\s+(idea|issue|concept|approach|method|theory|example|instance|argument|analysis|opinion|observation|fact|phenomenon|effect|result|outcome|aspect|element|factor|area|field|attempt|effort|opportunity|experience|understanding|explanation|situation|condition|problem|challenge|improvement|increase|decrease|difference|change|answer|response|solution|alternative|option|choice|decision|error|mistake|assumption|belief|conclusion|statement|question)\b/i,
    message: 'Check article usage before this vowel-sound word.',
    suggestion: 'If the following word starts with a vowel sound, use "an" instead of "a".',
  },
  {
    pattern: /(?:^|[.!?]\s+)([A-Z]\w*)\s+(is|was|has|had|makes|takes|needs|requires|represents|provides|offers|creates|produces|develops|establishes|maintains|supports|involves|includes|contains|shows|demonstrates|illustrates|indicates|suggests|reveals|exhibits|displays)\s+(?!a\b|an\b|the\b|this\b|that\b|these\b|those\b|some\b|any\b|no\b|each\b|every\b|both\b|all\b|many\b|much\b|few\b|several\b|one\b|two\b|three\b|our\b|my\b|his\b|her\b|its\b|their\b|your\b)[a-z]/im,
    message: 'A singular countable noun may be missing an article (a/an/the).',
    suggestion: 'Add "a", "an", or "the" before this countable noun.',
  },
];

// ═══════════════════════════════════════════════════════════════
// 5. Passive Voice Patterns
// ═══════════════════════════════════════════════════════════════

const PASSIVE_VOICE_PATTERNS = [
  /\b(was|were|is|are|been|being|be)\s+(written|done|made|taken|given|said|known|thought|found|told|asked|worked|seen|felt|tried|left|called|kept|let|begun|shown|heard|played|run|moved|lived|believed|brought|happened|written|provided|sent|built|used|considered|defined|described|determined|developed|established|expected|expressed|found|given|held|identified|included|indicated|influenced|investigated|known|made|measured|observed|obtained|performed|proposed|provided|received|recorded|related|reported|required|seen|shown|studied|taken|used)\s+(?:by|in|on|at|to|from|with|for|through|during|after|before|between|among|against|within|without)\b/i,
  /\b(it|this|that|these|those)\s+(was|were|is|are|been)\s+(observed|noted|found|determined|established|concluded|decided|agreed|believed|suggested|proposed|reported|shown|indicated|revealed|demonstrated|recognized|acknowledged|accepted|considered|assumed|hypothesized)\s+(?:that|by|to|in)\b/i,
];

// ═══════════════════════════════════════════════════════════════
// 6. Wordiness
// ═══════════════════════════════════════════════════════════════

interface WordinessEntry {
  pattern: RegExp;
  replacement: string;
  message: string;
}

const WORDINESS_RULES: WordinessEntry[] = [
  { pattern: /\bdue to the fact that\b/gi, replacement: 'because', message: '"Due to the fact that" is wordy. Use "because".' },
  { pattern: /\bin order to\b/gi, replacement: 'to', message: '"In order to" is wordy. Use "to".' },
  { pattern: /\bin the event that\b/gi, replacement: 'if', message: '"In the event that" is wordy. Use "if".' },
  { pattern: /\bat this point in time\b/gi, replacement: 'now', message: '"At this point in time" is wordy. Use "now" or "currently".' },
  { pattern: /\bfor the purpose of\b/gi, replacement: 'to', message: '"For the purpose of" is wordy. Use "to".' },
  { pattern: /\bin spite of the fact that\b/gi, replacement: 'although', message: '"In spite of the fact that" is wordy. Use "although" or "despite".' },
  { pattern: /\bin the near future\b/gi, replacement: 'soon', message: '"In the near future" is wordy. Use "soon".' },
  { pattern: /\bthe vast majority of\b/gi, replacement: 'most', message: '"The vast majority of" is wordy. Use "most".' },
  { pattern: /\bthe reason why is that\b/gi, replacement: 'because', message: '"The reason why is that" is wordy. Use "because".' },
  { pattern: /\bthe reason for\b/gi, replacement: 'because', message: '"The reason for" can often be shortened to "because".' },
  { pattern: /\bprior to\b/gi, replacement: 'before', message: '"Prior to" is formal. Consider "before".' },
  { pattern: /\bsubsequent to\b/gi, replacement: 'after', message: '"Subsequent to" is formal. Consider "after".' },
  { pattern: /\bin close proximity to\b/gi, replacement: 'near', message: '"In close proximity to" is wordy. Use "near".' },
  { pattern: /\bhas the ability to\b/gi, replacement: 'can', message: '"Has the ability to" is wordy. Use "can".' },
  { pattern: /\bis able to\b/gi, replacement: 'can', message: '"Is able to" is wordy. Use "can".' },
  { pattern: /\bis responsible for\b/gi, replacement: 'handles', message: '"Is responsible for" is wordy. Consider "handles" or "manages".' },
  { pattern: /\bin the process of\b/gi, replacement: '', message: '"In the process of" is often unnecessary.' },
  { pattern: /\bfor all intents and purposes\b/gi, replacement: '', message: '"For all intents and purposes" is usually unnecessary.' },
  { pattern: /\bin light of the fact that\b/gi, replacement: 'since', message: '"In light of the fact that" is wordy. Use "since" or "because".' },
  { pattern: /\bwhen it comes to\b/gi, replacement: 'regarding', message: '"When it comes to" is colloquial. Consider "regarding" or "concerning".' },
  { pattern: /\bneedless to say\b/gi, replacement: '', message: '"Needless to say" is usually unnecessary.' },
  { pattern: /\bby means of\b/gi, replacement: 'by', message: '"By means of" is wordy. Use "by".' },
  { pattern: /\bon account of\b/gi, replacement: 'because', message: '"On account of" is wordy. Use "because".' },
  { pattern: /\balong the lines of\b/gi, replacement: 'like', message: '"Along the lines of" is wordy. Use "like" or "similar to".' },
  { pattern: /\ba sufficient amount of\b/gi, replacement: 'enough', message: '"A sufficient amount of" is wordy. Use "enough".' },
  { pattern: /\beach and every\b/gi, replacement: 'each', message: '"Each and every" is redundant. Use "each" or "every".' },
  { pattern: /\bfirst and foremost\b/gi, replacement: 'first', message: '"First and foremost" is redundant. Use "first".' },
  { pattern: /\bthe question as to whether\b/gi, replacement: 'whether', message: '"The question as to whether" is wordy. Use "whether".' },
  { pattern: /\bthere is no doubt that\b/gi, replacement: 'clearly', message: '"There is no doubt that" is wordy. Use "clearly" or rephrase.' },
  { pattern: /\bgive an explanation of\b/gi, replacement: 'explain', message: '"Give an explanation of" is wordy. Use "explain".' },
];

// ═══════════════════════════════════════════════════════════════
// 7. Double Negatives
// ═══════════════════════════════════════════════════════════════

const DOUBLE_NEGATIVE_PATTERNS = [
  {
    pattern: /\b(don't|doesn't|didn't|won't|wouldn't|can't|couldn't|shouldn't|isn't|aren't|wasn't|weren't|haven't|hasn't|hadn't)\s+(have|has|had|got|get|need|want|know|find|see|do|make|go|come|say|think|feel|mean|seem|appear|look|sound|taste|smell|matter|work|help|care|like|love|hate|believe|agree|understand|remember|forget|expect|imagine|realize|notice|recognize|suggest|recommend|consider|allow|permit|enable|cause|produce|create|generate|involve|include|contain|provide|offer|give|send|bring|take|put|set|keep|leave|let|stop|start|begin|end|finish|continue|try|attempt|manage|fail|happen|occur|exist|remain|stay|stand|sit|lie|fall|rise|grow)|no\b/i,
    message: 'Double negative detected.',
    suggestion: 'Use a single negative form (e.g., "don\'t have any" instead of "don\'t have no").',
  },
  {
    pattern: /\b(not|never|nothing|nowhere|nobody|none|neither|hardly|scarcely|barely)\s+(no|not|nothing|nowhere|nobody|none|never|hardly|scarcely|barely)\b/i,
    message: 'Double negative detected. Two negative words in sequence create an unintended positive.',
    suggestion: 'Use a single negative form or rephrase the sentence.',
  },
  {
    pattern: /\bcannot\s+(no|never|nothing|nowhere|nobody|none)\b/i,
    message: 'Double negative detected: "cannot" + negative word.',
    suggestion: 'Use a single negative (e.g., "can only" or "cannot" + positive).',
  },
];

// ═══════════════════════════════════════════════════════════════
// 8. Sentence Fragment Detection
// ═══════════════════════════════════════════════════════════════

const FRAGMENT_TRANSITIONS = [
  'however', 'therefore', 'moreover', 'furthermore', 'nevertheless',
  'consequently', 'accordingly', 'additionally', 'alternatively',
  'subsequently', 'meanwhile', 'otherwise', 'instead', 'thus',
  'hence', 'indeed', 'besides', 'similarly', 'likewise', 'still',
  'nonetheless', 'notwithstanding', 'otherwise', 'regardless',
];

const COMMON_SENTENCE_STARTERS_NO_VERB = [
  'in addition', 'for example', 'for instance', 'as a result',
  'in fact', 'of course', 'in particular', 'on the other hand',
  'in other words', 'as a matter of fact',
];

// ═══════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════

/** Split text into sentences */
function splitSentences(text: string): Array<{ text: string; start: number; end: number }> {
  const sentences: Array<{ text: string; start: number; end: number }> = [];
  // Match sentences ending with .!? followed by space or end
  const regex = /[^.!?]*[.!?]+(?:\s+|$)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const trimmed = match[0].trim();
    if (trimmed.length > 0) {
      sentences.push({
        text: trimmed,
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }

  return sentences;
}

/** Check if a sentence contains a main (finite) verb */
function hasMainVerb(sentence: string): boolean {
  const mainVerbPattern = /\b(am|is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|shall|should|can|could|may|might|must)\b/i;
  const actionVerbPattern = /\b(\w{3,}(?:ed|es|s|ies|ing))\b/i;
  const commonVerbs = /\b(goes|went|gone|going|come|came|coming|take|took|taken|taking|make|made|making|give|gave|given|giving|say|said|saying|know|knew|known|knowing|think|thought|thinking|get|got|gotten|getting|find|found|finding|tell|told|telling|ask|asked|asking|work|worked|working|seem|seemed|seeming|feel|felt|feeling|try|tried|trying|leave|left|leaving|call|called|calling|keep|kept|keeping|begin|began|begun|beginning|show|showed|shown|showing|hear|heard|hearing|play|played|playing|run|ran|running|move|moved|moving|live|lived|living|believe|believed|believing|bring|brought|bringing|happen|happened|happening|write|wrote|written|writing|provide|provided|providing|sit|sat|sitting|stand|stood|standing|lose|lost|losing|pay|paid|paying|meet|met|meeting|include|included|including|continue|continued|continuing|set|setting|learn|learned|learning|change|changed|changing|lead|led|leading|understand|understood|understanding|watch|watched|watching|follow|followed|following|stop|stopped|stopping|create|created|creating|speak|spoke|spoken|speaking|read|reading|allow|allowed|allowing|add|added|adding|spend|spent|spending|grow|grew|grown|growing|open|opened|opening|walk|walked|walking|win|won|winning|offer|offered|offering|remember|remembered|remembering|love|loved|loving|consider|considered|considering|appear|appeared|appearing|buy|bought|buying|wait|waited|waiting|serve|served|serving|die|died|dying|send|sent|sending|expect|expected|expecting|build|built|building|stay|stayed|staying|fall|fell|fallen|falling|cut|cutting|reach|reached|reaching|kill|killed|killing|remain|remained|remaining)\b/i;

  return mainVerbPattern.test(sentence) || actionVerbPattern.test(sentence) || commonVerbs.test(sentence);
}

/** Count words in text */
function wordCount(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

/** Get list of coordinating and subordinating conjunctions */
function isConjunction(word: string): boolean {
  const conjunctions = new Set([
    'and', 'but', 'or', 'nor', 'for', 'yet', 'so',
    'because', 'although', 'though', 'while', 'whereas',
    'since', 'unless', 'until', 'if', 'when', 'where',
    'whether', 'after', 'before', 'once', 'that', 'as',
    'provided', 'supposing', 'even', 'than',
  ]);
  return conjunctions.has(word.toLowerCase());
}

/** Check if sentence has proper punctuation breaks (comma before conjunction, semicolon) */
function hasProperBreaks(sentence: string, wordList: string[]): boolean {
  // Check for commas before conjunctions (except first word)
  for (let i = 1; i < wordList.length; i++) {
    if (isConjunction(wordList[i])) {
      // Look back for a comma
      const textBefore = wordList.slice(0, i).join(' ');
      if (textBefore.includes(',')) return true;
    }
  }
  // Check for semicolons
  if (sentence.includes(';')) return true;
  // Check for colon
  if (sentence.includes(':')) return true;
  return false;
}

// ═══════════════════════════════════════════════════════════════
// Detector Functions
// ═══════════════════════════════════════════════════════════════

function detectSpellingErrors(text: string): GrammarIssue[] {
  const issues: GrammarIssue[] = [];
  const words = text.split(/\s+/);

  for (const word of words) {
    // Strip punctuation for checking
    const clean = word.replace(/[^a-zA-Z'-]/g, '').toLowerCase();
    if (clean.length < 3) continue;

    if (COMMON_MISSPELLINGS[clean]) {
      const originalStart = text.indexOf(word);
      issues.push({
        type: 'spelling',
        category: 'spelling',
        message: `"${clean}" is a common misspelling.`,
        suggestion: `Correct to: "${COMMON_MISSPELLINGS[clean]}"`,
        position: { start: originalStart, end: originalStart + word.length },
        originalText: clean,
        severity: 'error',
      });
    }
  }

  return issues;
}

function detectConfusedWords(text: string): GrammarIssue[] {
  const issues: GrammarIssue[] = [];

  for (const rule of CONFUSED_WORDS_RULES) {
    const match = rule.pattern.exec(text);
    if (match) {
      issues.push({
        type: 'mechanics',
        category: rule.category,
        message: rule.message,
        suggestion: rule.suggestion,
        position: { start: match.index, end: match.index + match[0].length },
        originalText: match[0],
        severity: 'warning',
      });
    }
  }

  return issues;
}

function detectSubjectVerbAgreement(text: string): GrammarIssue[] {
  const issues: GrammarIssue[] = [];

  for (const rule of SVA_RULES) {
    let match: RegExpExecArray | null;
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    // Find all matches, not just the first
    while ((match = regex.exec(text)) !== null) {
      // Skip if "are" is followed by "not" → "they are not" is fine
      if (match[0].includes(' are ') && match[0].includes(' not ')) continue;

      issues.push({
        type: 'grammar',
        category: 'subject-verb-agreement',
        message: rule.message,
        suggestion: rule.suggestion,
        position: { start: match.index, end: match.index + match[0].length },
        originalText: match[0],
        severity: 'error',
      });
    }
  }

  return issues;
}

function detectArticleErrors(text: string): GrammarIssue[] {
  const issues: GrammarIssue[] = [];

  for (const rule of ARTICLE_RULES) {
    const match = rule.pattern.exec(text);
    if (match) {
      issues.push({
        type: 'mechanics',
        category: 'article-usage',
        message: rule.message,
        suggestion: rule.suggestion,
        position: { start: match.index, end: match.index + match[0].length },
        originalText: match[0],
        severity: 'warning',
      });
    }
  }

  return issues;
}

function detectPassiveVoice(text: string): GrammarIssue[] {
  const issues: GrammarIssue[] = [];

  for (const pattern of PASSIVE_VOICE_PATTERNS) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      issues.push({
        type: 'style',
        category: 'passive-voice',
        message: 'Passive voice detected. Consider using active voice for clarity and directness.',
        suggestion: 'Rewrite in active voice: identify the actor and make them the subject.',
        position: { start: match.index, end: match.index + match[0].length },
        originalText: match[0],
        severity: 'info',
      });
    }
  }

  // Cap passive voice issues to avoid overwhelming the user
  return issues.slice(0, 10);
}

function detectWordiness(text: string): GrammarIssue[] {
  const issues: GrammarIssue[] = [];

  for (const rule of WORDINESS_RULES) {
    let match: RegExpExecArray | null;
    while ((match = rule.pattern.exec(text)) !== null) {
      const replacement = rule.replacement || '(remove)';
      issues.push({
        type: 'style',
        category: 'wordiness',
        message: rule.message,
        suggestion: `Replace with: "${replacement}"`,
        position: { start: match.index, end: match.index + match[0].length },
        originalText: match[0],
        severity: 'info',
      });
    }
  }

  return issues;
}

function detectDoubleNegatives(text: string): GrammarIssue[] {
  const issues: GrammarIssue[] = [];

  for (const rule of DOUBLE_NEGATIVE_PATTERNS) {
    const match = rule.pattern.exec(text);
    if (match) {
      issues.push({
        type: 'grammar',
        category: 'double-negatives',
        message: rule.message,
        suggestion: rule.suggestion,
        position: { start: match.index, end: match.index + match[0].length },
        originalText: match[0],
        severity: 'error',
      });
    }
  }

  return issues;
}

function detectSentenceFragments(text: string): GrammarIssue[] {
  const issues: GrammarIssue[] = [];
  const sentences = splitSentences(text);

  for (const sentence of sentences) {
    // Skip very short sentences (headings, etc.)
    if (wordCount(sentence.text) < 5) continue;

    // Skip quoted text
    if (sentence.text.startsWith('"') || sentence.text.startsWith("'")) continue;

    // Check if sentence starts with a transition but has no main verb
    const startsWithTransition = FRAGMENT_TRANSITIONS.some(
      t => sentence.text.toLowerCase().startsWith(t)
    );

    const startsWithPhrase = COMMON_SENTENCE_STARTERS_NO_VERB.some(
      p => sentence.text.toLowerCase().startsWith(p)
    );

    if ((startsWithTransition || startsWithPhrase) && !hasMainVerb(sentence.text)) {
      issues.push({
        type: 'grammar',
        category: 'sentence-fragment',
        message: 'This sentence may be a fragment — it appears to lack a main verb.',
        suggestion: 'Add a main verb or combine with the preceding sentence.',
        position: { start: sentence.start, end: sentence.end },
        originalText: sentence.text,
        severity: 'error',
      });
    }
  }

  return issues;
}

function detectRunOnSentences(text: string): GrammarIssue[] {
  const issues: GrammarIssue[] = [];
  const sentences = splitSentences(text);

  for (const sentence of sentences) {
    const words = wordCount(sentence.text);
    if (words > 40) {
      const wordList = sentence.text.split(/\s+/);
      const hasConjunction = wordList.some(w => isConjunction(w));

      // Only flag as run-on if it's very long and lacks proper breaks
      if (hasConjunction && !hasProperBreaks(sentence.text, wordList)) {
        issues.push({
          type: 'style',
          category: 'run-on-sentence',
          message: `This sentence is ${words} words long. Long sentences can be hard to follow. Consider splitting it.`,
          suggestion: `Break this ${words}-word sentence into shorter sentences using commas, semicolons, or periods.`,
          position: { start: sentence.start, end: sentence.end },
          originalText: sentence.text,
          severity: 'warning',
        });
      } else if (words > 50) {
        // Flag very long sentences even with proper breaks
        issues.push({
          type: 'style',
          category: 'run-on-sentence',
          message: `This sentence is ${words} words long. Consider breaking it into shorter sentences for readability.`,
          suggestion: `Split this long sentence into 2-3 shorter, more focused sentences.`,
          position: { start: sentence.start, end: sentence.end },
          originalText: sentence.text,
          severity: 'info',
        });
      }
    }
  }

  return issues;
}

function detectTenseConsistency(text: string): GrammarIssue[] {
  const issues: GrammarIssue[] = [];
  const sentences = splitSentences(text);

  // Detect predominant tense in the document
  const pastTenseVerbs = /\b(was|were|had|did|went|came|took|made|gave|said|knew|thought|got|found|told|asked|worked|felt|tried|left|called|kept|began|showed|heard|ran|moved|lived|believed|brought|happened|wrote|provided|sent|built|used|considered|defined|described|determined|developed|established|expected|expressed|found|given|held|identified|included|indicated|influenced|investigated|made|measured|observed|obtained|performed|proposed|provided|received|recorded|related|reported|required|studied|taken|wrote|wrote|accepted|achieved|added|allowed|appeared|applied|approached|argued|arose|assessed|assumed|attempted|attended|avoided|based|became|behaved|belonged|broke|brought|carried|caused|changed|chose|claimed|collected|combined|compared|completed|composed|conducted|confirmed|connected|consisted|contained|continued|contributed|controlled|converted|covered|created|crossed|decreased|demanded|demonstrated|derived|described|designed|desired|determined|developed|differed|discovered|discussed|displayed|emerged|enabled|encouraged|ensured|entered|established|evaluated|examined|exceeded|exhibited|existed|expanded|experienced|explained|explored|exposed|extended|failed|formed|gave|generated|governed|grew|handled|helped|identified|illustrated|implied|improved|included|increased|indicated|induced|influenced|informed|initiated|intended|introduced|investigated|involved|joined|judged|justified|lacked|launched|led|limited|linked|located|maintained|managed|meant|measured|met|needed|noted|obtained|occurred|offered|operated|originated|participated|perceived|performed|permitted|played|pointed|posed|predicted|preferred|prepared|presented|prevented|produced|progressed|promoted|proposed|protected|proved|provided|published|pursued|raised|reached|reacted|received|reduced|reflected|refused|regarded|related|released|remained|removed|repeated|replaced|reported|represented|requested|required|researched|resolved|responded|revealed|reviewed|rose)s?\b/i;

  const presentTenseVerbs = /\b(is|are|has|does|goes|comes|takes|makes|gives|says|knows|thinks|gets|finds|tells|asks|works|feels|tries|leaves|calls|keeps|begins|shows|hears|plays|runs|moves|lives|believes|brings|happens|writes|provides|sends|builds|uses|considers|defines|describes|determines|develops|establishes|expects|expresses|holds|identifies|includes|indicates|influences|investigates|measures|observes|obtains|performs|proposes|receives|records|relates|reports|requires|studies|takes|accepts|achieves|adds|allows|appears|applies|approaches|argues|arises|assesses|assumes|attempts|attends|avoids|bases|becomes|behaves|belongs|breaks|carries|causes|changes|chooses|claims|collects|combines|compares|completes|composes|conducts|confirms|connects|consists|contains|continues|contributes|controls|converts|covers|creates|crosses|decreases|demands|demonstrates|derives|designs|desires|develops|differs|discovers|discusses|displays|emerges|enables|encourages|ensures|enters|establishes|evaluates|examines|exceeds|exhibits|exists|expands|experiences|explains|explores|exposes|extends|fails|forms|generates|governs|grows|handles|helps|identifies|illustrates|implies|improves|includes|increases|indicates|induces|influences|informs|initiates|intends|introduces|investigates|involves|joins|judges|justifies|lacks|launches|leads|limits|links|locates|maintains|manages|means|measures|meets|needs|notes|obtains|occurs|offers|operates|originates|participates|perceives|performs|permits|plays|points|poses|predicts|prefers|prepares|presents|prevents|produces|progresses|promotes|proposes|protects|proves|provides|publishes|pursues|raises|reaches|reacts|receives|reduces|reflects|refuses|regards|relates|releases|remains|removes|repeats|replaces|reports|represents|requests|requires|researches|resolves|responds|reveals|reviews|rises)s?\b/i;

  // Analyze per-paragraph (group of sentences)
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);

  for (const paragraph of paragraphs) {
    const paraSentences = splitSentences(paragraph);
    if (paraSentences.length < 3) continue; // Need at least 3 sentences to check consistency

    let pastCount = 0;
    let presentCount = 0;
    let tenseSwitches: Array<{ text: string; start: number; end: number }> = [];

    let currentTense: 'past' | 'present' | 'mixed' | 'none' = 'none';

    for (const sentence of paraSentences) {
      const pastMatch = sentence.text.match(pastTenseVerbs);
      const presentMatch = sentence.text.match(presentTenseVerbs);

      const past = pastMatch ? pastMatch.length : 0;
      const present = presentMatch ? presentMatch.length : 0;

      pastCount += past;
      presentCount += present;

      if (past > present && currentTense === 'present') {
        tenseSwitches.push(sentence);
      } else if (present > past && currentTense === 'past') {
        tenseSwitches.push(sentence);
      }

      if (past > present && currentTense === 'none') currentTense = 'past';
      else if (present > past && currentTense === 'none') currentTense = 'present';
      else if (past > present) currentTense = 'past';
      else if (present > past) currentTense = 'present';
    }

    // Only flag if there are enough verbs and significant switching
    const totalVerbs = pastCount + presentCount;
    if (totalVerbs > 4 && tenseSwitches.length >= 2) {
      // Report the first tense switch
      const firstSwitch = tenseSwitches[0];
      issues.push({
        type: 'grammar',
        category: 'verb-tense-consistency',
        message: 'Verb tense inconsistency detected within this paragraph.',
        suggestion: 'Maintain consistent verb tense within each paragraph. If discussing past events, use past tense throughout.',
        position: { start: firstSwitch.start, end: firstSwitch.end },
        originalText: firstSwitch.text,
        severity: 'warning',
      });
    }
  }

  return issues.slice(0, 5); // Cap at 5 tense issues
}

// ═══════════════════════════════════════════════════════════════
// Score Calculator
// ═══════════════════════════════════════════════════════════════

function calculateScore(issues: GrammarIssue[], totalWords: number): number {
  if (totalWords === 0) return 100;

  // Weight penalties by severity
  let penalty = 0;
  for (const issue of issues) {
    switch (issue.severity) {
      case 'error': penalty += 5; break;
      case 'warning': penalty += 2; break;
      case 'info': penalty += 1; break;
    }
  }

  // Scale penalty based on document length (longer docs tolerate more minor issues)
  const scaledPenalty = penalty * (100 / Math.max(totalWords / 10, 1));
  const score = Math.max(0, Math.min(100, Math.round(100 - scaledPenalty)));

  return score;
}

// ═══════════════════════════════════════════════════════════════
// Main Export: checkGrammar
// ═══════════════════════════════════════════════════════════════

export function checkGrammar(text: string): GrammarResult {
  if (!text || text.trim().length === 0) {
    return {
      issues: [],
      score: 100,
      statistics: {
        totalIssues: 0,
        errors: 0,
        warnings: 0,
        info: 0,
        categories: [],
      },
    };
  }

  // Run all detectors
  const allIssues: GrammarIssue[] = [
    ...detectSpellingErrors(text),
    ...detectConfusedWords(text),
    ...detectSubjectVerbAgreement(text),
    ...detectArticleErrors(text),
    ...detectPassiveVoice(text),
    ...detectWordiness(text),
    ...detectDoubleNegatives(text),
    ...detectSentenceFragments(text),
    ...detectRunOnSentences(text),
    ...detectTenseConsistency(text),
  ];

  // Sort by position in text
  allIssues.sort((a, b) => a.position.start - b.position.start);

  // Remove duplicate positions
  const seen = new Set<number>();
  const uniqueIssues = allIssues.filter(issue => {
    const key = issue.position.start * 10000 + issue.position.end;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Calculate statistics
  const errors = uniqueIssues.filter(i => i.severity === 'error').length;
  const warnings = uniqueIssues.filter(i => i.severity === 'warning').length;
  const info = uniqueIssues.filter(i => i.severity === 'info').length;

  // Build category counts
  const categoryMap = new Map<string, number>();
  for (const issue of uniqueIssues) {
    categoryMap.set(issue.category, (categoryMap.get(issue.category) || 0) + 1);
  }
  const categories = Array.from(categoryMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  // Calculate score
  const totalWords = wordCount(text);
  const score = calculateScore(uniqueIssues, totalWords);

  return {
    issues: uniqueIssues,
    score,
    statistics: {
      totalIssues: uniqueIssues.length,
      errors,
      warnings,
      info,
      categories,
    },
  };
}
