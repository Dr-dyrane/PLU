import { readFile, readdir } from "node:fs/promises";

export const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
export const REQUEST_TIMEOUT_MS = 25_000;
export const SEARCH_LIMIT = 50;
export const REQUEST_DELAY_MS = 140;
export const EXPECTED_SIZE = 100;

export const allowedMime = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Words that make an image unsuitable for recognition-first checkout training.
 * This prevents plated meals, catalogue pages, animals, historical scans,
 * illustrations, and unrelated objects from winning on loose filename overlap.
 */
export const hardBlockedTokens = new Set([
  "advertisement", "annual", "atlas", "badge", "barcode", "barrel", "bhaji",
  "bird", "book", "bottle", "braised", "butterfly", "cake", "can", "casserole",
  "catalog", "catalogue", "chart", "chicken", "child", "chutney", "coin", "confit",
  "cooked", "cupcake", "curry", "diagram", "dictionary", "dish", "drawing", "dried",
  "emblem", "engraving", "fish", "flag", "florists", "grafting", "guide",
  "herbarium", "hornet", "icon", "illustration", "inflorescence", "juice", "kitten",
  "label", "leaflet", "lithograph", "logo", "maid", "map", "medal", "meat", "moth",
  "frozen", "gnocchi", "jadeite", "meal", "microscopy", "mole", "page", "painting",
  "pies", "plate", "poached", "portrait", "poster", "price", "print", "rabbit",
  "recipe", "requisites", "reserve", "restaurant", "rhizotron", "risotto", "salsa",
  "roasted", "salad", "sauce", "scallop", "screenshot", "seal", "seared", "seed",
  "seedling", "seeds", "shawarma", "skewer", "snail", "soup", "stamp", "symbol",
  "scan", "sculpture", "stereoscopic", "stuffed", "tart", "toasted", "vintage",
  "vilmorin", "washing", "watercolor", "wholesale", "whoopie", "zincograph",
]);

export const softBlockedTokens = new Set([
  "bacterial", "blossom", "cut", "dry", "flower", "flowering", "garden",
  "habit", "orchard", "plant", "sprouting", "tree",
]);

/** Keep identity-bearing modifiers such as colours, sizes, and cultivars. */
export const genericQueryTokens = new Set([
  "and", "bulk", "bunch", "cultivar", "edible", "fresh", "fruit", "fruits",
  "loose", "market", "produce", "single", "the", "vegetable", "vegetables",
]);

/** Shared product vocabulary required for every non-reviewed automatic image match. */
export const productHeadGroups = [
  ["almond", "almonds"],
  ["aloe"], ["arrowhead", "sagittaria", "tsee"], ["arrowroot", "maranta"],
  ["apple", "apples"], ["apricot", "apricots"], ["artichoke", "artichokes"],
  ["asparagus"], ["atemoya", "cherimoya"], ["avocado", "avocados"],
  ["banana", "bananas", "plantain", "plantains"], ["basil"], ["bean", "beans"],
  ["beet", "beets", "beetroot"],
  ["bittermelon", "bitter", "gourd", "karella", "momordica", "parval", "tinda", "tindora"],
  ["bok", "choi", "choy", "pak"], ["breadfruit"], ["breadnut"],
  ["broccoli", "broccolini", "lan"], ["cabbage", "cabbages", "napa", "savoy"],
  ["carrot", "carrots"], ["cassava", "yucca", "yuca"], ["chard"],
  ["chikoo", "naseberry", "sapodilla"], ["chive", "chives"], ["collard", "collards"],
  ["cucumber", "cucumbers"], ["dandelion"], ["dill"],
  ["eddoe", "eddoes", "taro", "colocasia"], ["endive", "escarole", "cichorium"],
  ["fennel", "anise"], ["granadilla", "passion"], ["grape", "grapes", "raisin"],
  ["grapefruit", "grapefruits"],
  ["chestnut", "chestnuts"], ["filbert", "filberts", "hazelnut", "hazelnuts"],
  ["fenugreek", "methi"], ["guar"], ["horseradish"], ["jicama"],
  ["kale", "cavolo"], ["kohlrabi"], ["leek", "leeks"], ["lettuce"], ["lily", "lilies"], ["lotus"],
  ["mango", "mangos", "mangoes"], ["malanga", "cocoyam", "xanthosoma", "cocoes"],
  ["melon", "melons", "honeydew", "watermelon", "watermelons"], ["mint"],
  ["moringa", "drumstick"], ["mushroom", "mushrooms", "pleurotus"],
  ["nectarine", "nectarines"], ["onion", "onions", "shallot", "shallots"],
  ["orange", "oranges", "clementine", "clementines"],
  ["parsley"], ["pea", "peas", "pisum"], ["pear", "pears", "pyrus", "nashi"],
  ["pepper", "peppers", "chili", "chilli", "capsicum"],
  ["persimmon", "persimmons", "hachiya"], ["pomelo", "pummelo", "citrus"],
  ["potato", "potatoes", "yam", "yams", "dioscorea", "boniato"],
  ["prickly", "opuntia"], ["pumpkin", "pumpkins", "squash", "chayote", "butternut", "acorn", "zucchini", "courgette", "cucurbita", "marrow", "qua"],
  ["quince"], ["radicchio", "chicory"], ["radish", "radishes"],
  ["rapini", "rabe", "raab"], ["rhubarb", "rheum"], ["rutabaga", "swede"],
  ["bamboo"], ["cane"], ["tamarillo", "tamarillos"], ["tamarind"], ["tangelo", "minneola"],
  ["tangerine", "mandarin"], ["tomato", "tomatoes", "tomatillo", "tomatillos"],
  ["turmeric", "curcuma", "kurkuma"],
  ["berry", "berries", "blueberry", "blackberry", "raspberry", "strawberry"],
  ["cauliflower"], ["celery"], ["cherry", "cherries"], ["coconut"], ["corn"],
  ["date", "dates"], ["eggplant", "aubergine"], ["fig", "figs"], ["garlic"],
  ["ginger"], ["kiwi"], ["longan", "lychee", "rambutan"], ["okra"],
  ["papaya", "papayas"], ["parsnip", "parsnips"], ["peach", "peaches"],
  ["lemon", "lemons", "lime", "limes"],
  ["pineapple", "pineapples"], ["plum", "plums", "pluot", "plumcot", "plumcots"],
  ["pomegranate", "pomegranates"], ["spinach"], ["starfruit", "guava"],
  ["turnip", "turnips"], ["watercress"],
];

export const fruitFamilies = new Set([
  "apples", "apricots", "avocados", "bananas", "berries", "cherries", "citrus",
  "dates", "figs", "grapes", "kiwi", "mangoes", "melons", "nectarines",
  "oranges", "papayas", "passion fruit", "peaches", "pears", "persimmons",
  "nuts", "pineapples", "plums", "pomegranates", "quince", "stone fruit", "tropical fruit",
  "watermelons",
]);

export const peerColors = ["#4F8B58", "#C25D52", "#D1A23B", "#7C5AA8", "#547FA8"];

export const queryAliasesByCatalogId = {
  "almonds-bulk-nuts": ["raw almonds", "whole almonds nuts"],
  "arrow-head-tsee-goo": [
    "edible Chinese arrowhead corm", "Sagittaria sagittifolia tuber", "Tsee Goo vegetable",
  ],
  "arrow-root": ["arrowroot rhizome", "Maranta arundinacea edible rhizome"],
  "bean-sprouts": ["mung bean sprouts raw", "fresh bean sprouts produce"],
  "chestnuts-bulk-nuts": ["raw chestnuts whole", "fresh chestnut nuts"],
  "bok-choy-shanghai": [
    "Shanghai pak choi", "bok choy vegetable", "pak choi vegetable",
    "Brassica rapa chinensis",
  ],
  "bok-choy-baby-hai-tupak-choy": ["baby pak choi", "baby bok choy"],
  "anise-fennel-herbs": ["Florence fennel bulb", "fennel vegetable bulb"],
  "beans-long-chinese-dow-gok-bodie": ["yardlong beans", "Chinese long bean pods"],
  bittermelon: ["bitter gourd", "Momordica charantia fruit"],
  "cabbages-chinese-nappa-suey-choy": ["napa cabbage", "Chinese cabbage head"],
  "eddoes-taro-root-small": ["eddoe taro corm", "taro corms", "Colocasia antiquorum corm"],
  "don-gua-winter-melon": ["winter melon whole", "Benincasa hispida fruit", "dong gua melon"],
  "drumstick": ["moringa pods vegetable", "drumstick vegetable pods", "Moringa oleifera pods"],
  "filberts-bulk-nuts": ["filbert nuts whole", "hazelnuts in shell"],
  "gai-lan-chinese-broccoli": ["gai lan", "Chinese broccoli vegetable", "Chinese kale"],
  "malagna-root-cocoes": ["malanga root corm", "cocoyam corm", "Xanthosoma edible root"],
  "methi-leaf-fenugreek": ["fresh methi leaves", "fenugreek leaves vegetable"],
  "kale-black": ["lacinato kale", "Tuscan kale", "cavolo nero"],
  "lettuce-escarole": [
    "broad-leaved endive", "broad leaf endive vegetable",
    "Cichorium endivia latifolium", "escarole endive",
  ],
  "mushrooms-oyster-bulk-handwritten": ["oyster mushrooms", "Pleurotus ostreatus"],
  "rapini-saag": [
    "broccoli rabe", "broccoli raab", "cime di rapa", "Brassica rapa ruvo",
    "rapini vegetable",
  ],
  radicchio: ["red chicory head", "Cichorium intybus radicchio"],
  rutabaga: ["swede root vegetable", "Brassica napus napobrassica"],
  "peppers-scotch-bonnet-handwritten": ["Scotch bonnet chili", "Capsicum chinense Scotch bonnet"],
  "potatoes-yams-caribbean-sweet": ["boniato sweet potato", "batata sweet potato tuber"],
  "potatoes-yams-jamaican-sweet": ["Jamaican boniato", "Caribbean sweet potato tuber"],
  "potatoes-yams-white-long": ["white yam Dioscorea rotundata", "African white yam tuber"],
  "potatoes-yams-white-yam": ["white yam Dioscorea rotundata", "African yam tuber"],
  "potatoes-yams-yellow-yam": ["yellow yam Dioscorea cayenensis", "Guinea yellow yam"],
  "pears-asian-yellow": ["Asian pear", "nashi pear", "Pyrus pyrifolia fruit"],
  "pears-yali-ya": ["Yali pear", "Chinese white pear", "Pyrus bretschneideri Yali", "Asian pear"],
  "grapes-italy-green": ["Italia grape", "Italia table grapes", "Muscat Italia grapes", "Raisin Italia"],
  "melons-hami-handwritten": ["Hami melon", "Chinese Hami melon"],
  "melons-santa-claus-handwritten": ["Piel de Sapo melon", "Santa Claus melon"],
  "pummelo-white-chinese": ["white pomelo", "Chinese pomelo", "Citrus maxima fruit"],
  "tangelos-minneola-handwritten": ["Minneola tangelo", "Honeybell tangelo"],
  "peppers-green-finger-hot": ["green finger chilli", "green chili pepper", "green cayenne pepper"],
  "peas-green-english-bulk": ["English peas pods", "garden peas in pods", "Pisum sativum pods"],
  "peas-sugar-pea-tips-ethnic-veg": ["fresh pea shoots", "sugar pea tips", "edible pea leaves"],
  "leeks-baby": ["baby leeks raw", "young leeks vegetable"],
  "leeks-regular": ["fresh leeks vegetable", "leek bunch raw"],
  "lettuce-red-leaf": ["red leaf lettuce head"],
  "lettuce-green-leaf": ["green leaf lettuce head"],
  "tomatoes-on-the-vine-bulk-mesh": ["tomatoes on vine cluster", "vine tomatoes cluster"],
  "tomatoes-vine-ripe-big": ["vine ripe tomato", "beefsteak tomato raw"],
  "watermelon-red-seedless-cuts": ["seedless watermelon cut pieces", "fresh cut watermelon"],
  "persimmons-hachiya-japanese-99038": ["Hachiya persimmon fresh fruit"],
  "mangos-yellow": ["yellow mango whole fruit"],
  "chives-nira": ["cut garlic chives", "Chinese garlic chives"],
};

/**
 * Exact synonym or scientific-name evidence for reviewed files whose Commons
 * metadata does not contain the learner-facing product head.
 */
export const reviewedIdentityEvidenceByCatalogId = {
  "parsley-root-herbs": ["petersilienwurzel", "Petroselinum crispum root"],
  "radicchio": ["radicchio"],
  "rapini-saag": ["rapini", "Brassica rapa"],
  "squash-long-opo": ["Lagenaria siceraria", "longissima snake gourds"],
  "tangerines-mandora": ["mandora"],
  "plums-june": ["Spondias dulcis", "ambarella"],
  "ong-choy": ["water spinach", "Ipomoea aquatica"],
  "qua": ["Luffa acutangula", "angled luffa"],
  "melons-cantaloupe-large": ["cantaloupes", "Cucumis melo"],
  "persimmons-sharon-fruit": ["sharon fruit", "sharon fruits"],
  "a-choy": ["Indian lettuce", "Lactuca sativa"],
  "water-chestnut": ["wasserkastanien", "Eleocharis dulcis"],
  "guar": ["cluster bean", "Cyamopsis tetragonoloba"],
  "plums-cherry-plum-handwritten": ["kirschpflaumen", "Prunus cerasifera"],
};

/** Exact source-title overrides reviewed against the intended product. */
export const mediaOverridesByCatalogId = {
  "breadnut": "Chataigne, Debe Market, Trinidad and Tobago.JPG",
  "cauliflower-organic": "Organic Cauliflower.JPG",
  "nectarines-white-flesh": "White nectarine and cross section02 edit.jpg",
  "carrots-bunch": "Carrots at Ljubljana Central Market.JPG",
  "cassava-root-yucca": "PeeLawPeeNam Cassava root Yuca Manioc.jpg",
  "kale-black": "Lacinato Kale.jpg",
  "lettuce-green-leaf": "Starr 070730-7909 Lactuca sativa.jpg",
  "lettuce-red-leaf": "Starr 070730-7907 Lactuca sativa.jpg",
  "mushrooms-oyster-bulk-handwritten": "Oyster mushrooms at the Santa Fe Farmers' Market (15450536494).jpg",
  "onions-pickling": "Pearl onions (5313561388).jpg",
  "tangerines-mandora": "Mandora.JPG",
  "kale-organic": "WIC Environments in Michigan (20230621-USDA-FNS-UNK-0147).jpg",
  "peppers-green-thai-chilli": "Birdchili.jpg",
  "tomatoes-heir-variety": "Organic heirloom tomato at the Jack London Square Farmers' Market 20150809-OC-LSC-0001 (21661742600).jpg",
  "potatoes-yams-caribbean-sweet": "Root vegetable at Cuban street market.jpg",
  "zucchini-grey": "Cucurbita pepo Zapallito largo Argentina 2 - 'Zucchini Grey'.jpg",
  "prickly-pears-bulk": "Prickly pears.jpg",
  "mangos-ataulfo": "Mango Ataulfo.jpg",
  "mangos-yellow": "Perhentian Islands, Yellow mangoes, Malaysia.jpg",
  "tinda": "Desi Tinda.JPG",
  "mangos-julie": "Julie Mango.jpg",
  "grapefruit-red-large": "Liat Portal for Foodie Disorder - Red grapefruit.jpg",
  "corn-bicolour-bulk": "Liat Portal for Foodie Disorder - Fresh Corn on the Cob.jpg",
  "celery-sticks-singles": "Celery (1).jpg",
  "mangos-sweet": "Ripe mangoes.jpg",
  "bananas-organic": "Organic bananas with plastic stickers.jpg",
  "lemons-large": "Whole-Lemon.jpg",
  "carrots-red-handwritten": "HK SW 上環 Sheung Wan 皇后大道西 12 Queen's Road West 聯發商業大廈 Arion Commercial Building shop 惠康超市 Wellcome Supermarket goods vegetable red carrot October 2022 Px3.jpg",
  "plums-italian-prune": "Prunes Viktualienmarkt Munich.jpg",
  "plums-cherry-plum-handwritten": "Kirschpflaumen (Prunus cerasifera).jpg",
  "tamarillo-red": "Red tamarillo fruit.jpg",
  "methi-leaf-fenugreek": "Methi leaves.jpg",
  "peas-sugar-pea-tips-ethnic-veg": "Pea shoots for sale at Jack London Square.jpg",
  "onions-yellow-bulk": "Yellow onions vegetables.jpg",
  "squash-banana": "Winter Squash 'Pink Banana' (Cucurbita maxima).jpg",
  "squash-kabocha": "Cucurbita moschata-kabocha fruit-Laulima Farms Cafe Kipahulu.jpg",
  "qua": "Luffa acutangula vegetable 019.jpg",
  "vegetable-marrow": "Cucurbita pepo 'Zucchini Grey' (market in Buenos Aires) side view.jpg",
  "melons-cantaloupe-large": "Cantaloupes Market 1.JPG",
  "melons-honeydew-large": "Honeydew melons in a stack.jpg",
  "cabbage-taiwanese": "Brassica oleracea Cabbage display in Tottenham London England.jpg",
  "persimmons-sharon-fruit": "Sharon fruits.jpg",
  "pineapple-large": "Pineapple.jpg",
  "potato-white-baby-bulk": "2402Baby potatoes of the Philippines 01.jpg",
  "watermelon-red-seedless-cuts": "Watermelon seedless.jpg",
  "peppers-thai-red-hot-bulk": "DFC 4979 Bright red birds eye chilies piled in plastic cups at a market in Ban Soi Methro Changwat Chon Buri Thailand.jpg",
  "a-choy": "HK food green long leaf vegetable Indian lettuce 油麥菜 Lactuca sativa November 2022 Px3 01.jpg",
  "kale-red": "Red kale.png",
  "chives-nira": "Cut Garlic Chives.jpg",
  "arrow-root": "Arrow root.jpg",
  "lily-bulbs": "Fresh Lily Bulb from Japan.jpg",
  "don-gua-winter-melon": "A Giant of Winter Melon at Blue Basket.jpg",
  "guar": "Cluster bean for sale.JPG",
  "celery-chinese": "Chinese celery.jpg",
  "tamarind": "FRESH TAMARIND.jpg",
  "pomelo-red-handwritten": "Pomelo with rind removed and segments.jpg",
  "pears-rocha-handwritten": "Rocha Pear 2017 A1.jpg",
  "broccolini-handwritten": "USDA Broccolini.jpg",
  "cucumbers-mini-handwritten": "Mini cucumber.png",
  "squash-long-opo": "Edible immature Lagenaria siceraria fruits, longissima snake gourds.jpg",
  "tangerines-honey": "Tangerine 2009-03-11.jpg",
  "plums-june": "Spondias dulcis3.jpg",
  "plums-yellow": "Golden (yellow) Plums.jpg",
  "pumpkins-pie": "Full Belly Farm Organic Sugar Pie Pumpkin (43755490110).jpg",
  "pumpkins-regular": "Orange pumpkins.jpg",
  "pumpkins-small": "Munchkin Pumpkin.jpg",
  "sugar-cane": "Sugarcane 7419.JPG",
  "granadilla": "Sweet granadillas (Passiflora ligularis) - whole and cross section.jpg",
  "eggplants-indian-baby": "Starr-070730-7856-Solanum melongena-round purple variety-Foodland Pukalani-Maui (24890475795).jpg",
  "figgs-black": "Stellar Black Mission Figs (22856783955).jpg",
  "chestnuts-bulk-nuts": "Chestnuts at Ljubljana Central Market.JPG",
  "chikoo-naseberry": "Chikoo.JPG",
  "coconuts-green-water": "Green Coconut Fruits.jpg",
  "swiss-chard-red": "Starr-070730-7872-Beta vulgaris subsp cicla-red Swiss chard-Foodland Pukalani-Maui (24262356794).jpg",
  "watercress-herbs": "Watercress (1).JPG",
  "malagna-root-cocoes": "Macabo.jpg",
  "taro-root-medium": "Taro root (taro corm).jpg",
  "bok-choy-baby-jr": "Baby bok choy.jpg",
  "ong-choy": "Water spinach.jpg",
  "yu-choy": "Chinese vegetable 027.jpg",
  "gai-choy": "Gai Choi Mustard Greens - J K Asian Grocery (5050526668).jpg",
  "endive-chicory": "Friseesalat1 (fcm).jpg",
  "bamboo-shoots": "A Bamboo shoots at Vegetable Market in Yuen Long.jpg",
  "arrow-head-tsee-goo": "Kuwai tubers - for sale - 2024 Dec 28.jpeg",
  "water-chestnut": "Wasserkastanien.jpg",
  "sweet-potato-japanaese": "Annou imo.JPG",
  "squash-hairy-fuzzy-qua-mogwa": "Benincasa hispida var. chieh-qua 节瓜 Jointed Wax Gourd.jpg",
  "karella-indian": "Bittergourd.jpg",
  "parval": "Trichosanthes dioica (fruit).jpg",
  "tindora": "Ivy gourd ( Scientific name-Coccinia grandis) on a vegetable sack.jpg",
  "anise-fennel-herbs": "Finocchio 2.jpg",
  "artichokes-large": "Artichoke stack.JPG",
  "bok-choy-shanghai": "20140223-OC-LSC-0115 (14822531181).jpg",
  "beans-long-chinese-dow-gok-bodie": "Snake Bean BNC.jpg",
  "beets-bunch": "Beta vulgaris, San Francisco farmers market.jpg",
  "bittermelon": "Bitter melon 01.jpg",
  "carrots-jumbo": "Big Carrot-2356.jpg",
  "collard-greens": "Collard green bunches.jpg",
  "eddoes-taro-root-small": "Taro Root, Eddoe or Colocasia Esculenta.jpg",
  "endive-belgium": "Endive p1160063.jpg",
  "gai-lan-chinese-broccoli": "Gai lan.jpg",
  "kohlrabi-green": "GreenKohlrabi.jpg",
  "leeks-baby": "Leeks in a bundle.jpg",
  "leeks-regular": "Leeks on shelf.jpg",
  "lettuce-escarole": "Andijvie rand Cichorium endivia.jpg",
  "mint-bunch-herbs": "Liat Portal for Foodie Disorder - Fresh Mint from San Francisco Farmers Market.jpg",
  "onions-sweet": "Sweet onions 1.jpg",
  "peas-green-english-bulk": "Green peas 8927.jpg",
  "peas-sugar-snap-bulk": "Sugar Snap Peas or ervilhas (20818785979).jpg",
  "peppers-green-finger-hot": "Bhiwapur Chilli - Green Unripened.jpg",
  "peppers-scotch-bonnet-handwritten": "Jamaican scotch bonnet peppers.jpg",
  "peppers-yellow-hot": "Long yellow chili pepper.jpg",
  "radicchio": "Radicchio.jpg",
  "radishes-bunch": "Radish bunches.jpg",
  "rapini-saag": "Rapini.jpg",
  "rhubarb": "Rheum rhabarbarum stalks.jpg",
  "squash-spaghetti": "Spaghetti Squash.JPG",
  "tomatoes-on-the-vine-bulk-mesh": "Cluster of Tomatoes on Vine.jpg",
  "tomatoes-vine-ripe-big": "Strauchtomaten.jpg",
  "turmeric": "Kurkuma.jpg",
  "potatoes-yellow-yukon-gold-bulk-handwritten": "Yukon Gold Creamers (29019239791).jpg",
  "potatoes-yams-jamaican-sweet": "Sweet-potato.JPG",
  "zucchini-yellow": "Starr-110822-8270-Cucurbita pepo-summer squash yellow zucchini fruit-Hawea Pl Olinda-Maui (24735759729).jpg",
  "persimmons-hachiya-japanese-99038": "Hachiya persimmons - Heart of the City Farmers' Market - San Francisco.jpg",
  "pummelo-white-chinese": "Citrus Grandis - Honey White - original.jpg",
  "tangerines-mandarin": "Mandarin Oranges (Citrus Reticulata).jpg",
  "watermelons-red-seeded-jumbo": "Crimson Sweet watermelon.jpg",
  "pears-asian-yellow": "Golden Asian Pear.png",
  "pears-red": "Rote Birne.jpg",
  "pears-yali-ya": "Ya pears 20250509 182727.jpg",
  "grapes-crimson": "Crimson Seedless Grapes.jpg",
  "parsley-root-herbs": "Petersilienwurzel (fcm).jpg",
  "beans-yellow-wax": "Yellow capitano bush bean.jpg",
  "aloe": "Aloe vera for sale.jpg",
  "tomato-hh-red-bulk": "Healthy Red Tomatoes with Water Drops.jpg"
};

export const knownBadMediaFiles = new Set([
  "Bowl o' Beans (8064569864).jpg",
  "Nectarine stone.jpg",
  "Watermelon slices BNC.jpg",
  "Pineapple (Ananas comosus).jpg",
  "Yellow hot peppers, in Kano state.jpg",
  "Fenouil de Florence Vilmorin-Andrieux 1883.png",
  "Flowering Globe Artichoke - geograph.org.uk - 542107.jpg",
  "A child with a bunch of beets (I0004493).jpg",
  "Momordica charantia (Bitter melon) and a kitten.jpg",
  "Horitucultural guide - spring 1892 (1892) (14803494943).jpg",
  "Beckert's garden annual - 1949 (1949) (20172789349).jpg",
  "Hibiscus Poached Rhubarb - Garden radishes, Belgian endive, ruby beet essence and toasted hazelnut \"Génoise\" (19329867581).jpg",
  "Gai lan & crisped shallots (3169331473).jpg",
  "Saddle of Rabbit, Confit San Manzano Tomatoes, Baby Leeks, Pommes Dauphine.jpg",
  "A Ladies Maid Purchasing a Leek (BM 1867,0309.741).jpg",
  "Catalogue of seeds, plants, bulbs and fruits (1895) (20575454722).jpg",
  "Two peas in a pod cupcake.jpg",
  "DFC 0309 Close-up of skewers with bright red glazed meat chunks green bell pepper pieces and pineapple wedges threaded on wooden sticks.jpg",
  "Cichorium intybus habit1 (12112696354).jpg",
  "Manns' superior seeds (16204161377).jpg",
  "Starr-120608-7318-Brassica rapa-broccoli rabe flowers-Ulupalakua Ranch-Maui (24777612899).jpg",
  "Japanese-style potato salad with Yukon gold potatoes, hard-boiled eggs, Kewpie, apple cider vinegar smoked sausage, bacon, fried shallots, and chives. -thanksgiving (15867845156).jpg",
  "Dou-jou Hachiya gaki,traditional dry fruit in Gifu, 2017.jpg",
  "Asian Giant Hornet (20210216-ARS-LSC-0431).jpg",
  "The Apple and pear as vintage fruits (Page 111) BHL6364618.jpg",
  "4- (Cru) Live Scallop, Celery Root, Yali Pear.jpg",
  "HK WTSD Wong Tai Sin District 牛池灣 Ngau Chi Wan 彩虹站 MTR Choi Hung Station concourse shop 美心西餅 Maxim's Cakes Bakery August 2022 Px3 yellow mango fruit cakes tarts.jpg",
  "Bolgiano's \"glory\" tomato - out yields and out sells any tomato on the market by far the best tomato ever grown (1917) (20202596108).jpg",
  "Organically grown iceberg lettuce from Gurgaon, Haryana, India.jpg",
]);

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function normalize(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/^file:/, "")
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function words(value) {
  return normalize(value).split(/\s+/).filter((word) => word.length >= 3);
}

export function slugify(value) {
  return normalize(value).replaceAll(" ", "-");
}

export function categoryForFamily(family) {
  const normalized = normalize(family);
  if (normalized === "herbs") return "herb";
  if (fruitFamilies.has(normalized)) return "fruit";
  return "vegetable";
}

export function cleanFileTitle(title) {
  return title.replace(/^File:/, "");
}

export async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

export async function loadJsonRecords(directoryUrl, filter = () => true) {
  const names = (await readdir(directoryUrl).catch(() => []))
    .filter((name) => name.endsWith(".json") && filter(name))
    .sort();
  const records = [];
  for (const name of names) {
    const value = await readJson(new URL(name, directoryUrl));
    for (const record of Array.isArray(value) ? value : [value]) records.push(record);
  }
  return records;
}

export async function commonsRequest(parameters) {
  let lastError = null;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(new Error(`Commons request timed out after ${REQUEST_TIMEOUT_MS} ms`)),
      REQUEST_TIMEOUT_MS,
    );
    try {
      const response = await fetch(COMMONS_API, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent": "PLU-media-resolver/3.0 (+https://plu-beta.vercel.app/)",
        },
        body: new URLSearchParams({
          action: "query", format: "json", formatversion: "2", ...parameters,
        }),
      });
      if (response.status === 429 || response.status >= 500) {
        const retryAfter = Number.parseFloat(response.headers.get("retry-after") ?? "");
        const waitMs = Number.isFinite(retryAfter)
          ? Math.max(3_000, retryAfter * 1_000)
          : Math.min(18_000, 1_500 * 2 ** (attempt - 1));
        await response.body?.cancel().catch(() => {});
        clearTimeout(timeout);
        if (attempt < 6) {
          console.warn(`Commons returned ${response.status}; waiting ${Math.round(waitMs / 1000)}s.`);
          await sleep(waitMs);
          continue;
        }
      }
      if (!response.ok) {
        throw new Error(`Commons API returned HTTP ${response.status} ${response.statusText}`);
      }
      const result = await response.json();
      clearTimeout(timeout);
      return result;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < 6) await sleep(Math.min(12_000, 1_000 * 2 ** (attempt - 1)));
    }
  }
  throw lastError ?? new Error("Commons request failed.");
}
