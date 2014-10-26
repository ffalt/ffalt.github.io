'use strict';

var utils = {};

utils.unicodeEscape = function (str) {
	for (var result = '', index = 0, charCode; !isNaN(charCode = str.charCodeAt(index++));) {
		result += '\\u' + ('0000' + charCode.toString(16)).slice(-4);
	}
	return result;
};

utils.reverse = function (s) {
	return s.split("").reverse().join("");
};

utils.randomItem = function (array) {
	return array[Math.floor(array.length * Math.random())]
};

utils.fixedFromCharCode = function (codePt) {
	if (codePt > 0xFFFF) {
		codePt -= 0x10000;
		return String.fromCharCode(0xD800 + (codePt >> 10), 0xDC00 + (codePt & 0x3FF));
	} else {
		return String.fromCharCode(codePt);
	}
};

var Morphs = {};

Morphs.BaseMorph = function (m, morph) {
	var me = this;
	me.name = m.name;
	me.info = m.info;
	me.morph = morph;
	me.getId = function () {
		return me.name.toLowerCase().replace(/ /g, '_');
	};
	return me;
};

Morphs.BaseCharMorph = function (m, c2c, final) {
	return new Morphs.BaseMorph(m, function (txt) {
		var s = txt.split("").map(c2c).join("");
		if (final) return final(s);
		return s;
	});
};

Morphs.AlphabetMorph = function (alphabet) {
	return new Morphs.BaseCharMorph(alphabet, function (c) {
		c = alphabet.lowercase ? c.toLowerCase() : c;
		return alphabet.entries[c] ? alphabet.entries[c].u : c;
	}, function (txt) {
		if (alphabet.reverse) return utils.reverse(txt);
		return txt;
	});
};

Morphs.MapAlphabetMorph = function (alphabet) {
	return new Morphs.BaseCharMorph(alphabet, function (c) {
		c = alphabet.lowercase ? c.toLowerCase() : c;
		return alphabet.entries[c] ? utils.randomItem(alphabet.entries[c]).u : c;
	}, function (txt) {
		if (alphabet.reverse) return utils.reverse(txt);
		return txt;
	});
};

Morphs.CharCallbackMorph = function (cm) {
	var me = new Morphs.BaseCharMorph(cm, function (c, i) {
		return cm.callback(c, i, me.options);
	}, function (txt) {
		if (cm.reverse) return utils.reverse(txt);
		return txt;
	});
	me.options = cm.options;
	return me;
};

Morphs.TextCallbackMorph = function (cm) {
	var me = new Morphs.BaseMorph(cm, function (txt) {
		txt = cm.callback(txt, me.options);
		if (cm.reverse) txt = utils.reverse(txt);
		return txt;
	});
	me.options = cm.options;
	return me;
};

Morphs.OffsetMorph = function (om) {

	var exceptionFilter = {
		"1d455": "210e",
		"1d49d": "212c",
		"1d4a0": "2130",
		"1d4a1": "2131",
		"1d4a3": "210b",
		"1d4a4": "2110",
		"1d4a7": "2112",
		"1d4a8": "2133",
		"1d4ad": "211b",
		"1d4ba": "212f",
		"1d4bc": "210a",
		"1d4c4": "2134",
		"1d506": "212d",
		"1d50b": "210c",
		"1d50c": "2111",
		"1d515": "211c",
		"1d51d": "2128",
		"1d53a": "2102",
		"1d53f": "210d",
		"1d545": "2115",
		"1d547": "2119",
		"1d548": "211a",
		"1d549": "211d",
		"1d551": "2124"
	};

	var me = new Morphs.BaseCharMorph(om, function (c) {
		if (me.options.offset == 0) return c;
		var s = c.charCodeAt(0);
		if ((s > 64 && s < 123) || (s > 32 && 2 < 127 && me.options.offset < 100000)) {
			var metaOffset = (s > 96 && s < 123) ? -6 : 0;
			var newOffset = (me.options.offset > 100000) ? parseInt(me.options.offset) + parseInt(s) + metaOffset : parseInt(me.options.offset) + parseInt(s);
			newOffset = newOffset.toString(16);
			newOffset = exceptionFilter[newOffset] ? exceptionFilter[newOffset] : newOffset;
			//console.log(s, newOffset, fixedFromCharCode("0x" + newOffset));
			return utils.fixedFromCharCode("0x" + newOffset)
		} else {
			return c;
		}
	});

	me.info = {
		name: "twitalics",
		link: "https://mothereff.in/twitalics"
	};

	me.options = {offset: om.offset};

	return me;
};

Morphs.OffsetGroupMorph = function (om) {
	var me = Morphs.OffsetMorph({name: om.name, offset: om.default});
	if (om.bold) {
		me.options.hasBold = true;
		me.options.bold = false;
	}
	if (om.italic) {
		me.options.hasItalic = true;
		me.options.italic = false;
	}
	if (me.options.hasBold || me.options.hasItalic) {
		me.options.hasVariations = true;
	}
	var orgmorph = me.morph;
	me.morph = function (txt) {
		if (me.options.hasBold && me.options.hasItalic && me.options.bold && me.options.italic) {
			me.options.offset = om.bolditalic;
		} else if (me.options.hasBold && me.options.bold) {
			me.options.offset = om.bold;
		} else if (me.options.hasItalic && me.options.italic) {
			me.options.offset = om.italic;
		} else
			me.options.offset = om.default;
		return orgmorph(txt);
	};
	return me;
};

Morphs.build = function () {
	var ms = [];
	Alphabets.simple.forEach(function (a) {
		ms.push(new Morphs.AlphabetMorph(a));
	});
	Alphabets.charcallbacks.forEach(function (a) {
		ms.push(new Morphs.CharCallbackMorph(a));
	});
	Alphabets.txtcallbacks.forEach(function (a) {
		ms.push(new Morphs.TextCallbackMorph(a));
	});
	Alphabets.offsets.forEach(function (a) {
		ms.push(new Morphs.OffsetMorph(a));
	});
	Alphabets.offsetsgroup.forEach(function (a) {
		ms.push(new Morphs.OffsetGroupMorph(a));
	});
	Alphabets.maps.forEach(function (a) {
		ms.push(new Morphs.MapAlphabetMorph(a));
	});
	return ms;
};

var Alphabets = {
	simple: [
		{
			"name": "Changed",
			"lowercase": true,
			"entries": {
				"a": {
					"u": "\u03b1",
					"c": "α"
				},
				"b": {
					"u": "\u0432",
					"c": "в"
				},
				"c": {
					"u": "\u00a2",
					"c": "¢"
				},
				"d": {
					"u": "\u2202",
					"c": "∂"
				},
				"e": {
					"u": "\u0454",
					"c": "є"
				},
				"f": {
					"u": "\u0192",
					"c": "ƒ"
				},
				"h": {
					"u": "\u043d",
					"c": "н"
				},
				"i": {
					"u": "\u03b9",
					"c": "ι"
				},
				"j": {
					"u": "\u05e0",
					"c": "נ"
				},
				"k": {
					"u": "\u043a",
					"c": "к"
				},
				"l": {
					"u": "\u2113",
					"c": "ℓ"
				},
				"m": {
					"u": "\u043c",
					"c": "м"
				},
				"n": {
					"u": "\u03b7",
					"c": "η"
				},
				"o": {
					"u": "\u03c3",
					"c": "σ"
				},
				"p": {
					"u": "\u03c1",
					"c": "ρ"
				},
				"r": {
					"u": "\u044f",
					"c": "я"
				},
				"s": {
					"u": "\u0455",
					"c": "ѕ"
				},
				"t": {
					"u": "\u0442",
					"c": "т"
				},
				"u": {
					"u": "\u03c5",
					"c": "υ"
				},
				"v": {
					"u": "\u03bd",
					"c": "ν"
				},
				"w": {
					"u": "\u03c9",
					"c": "ω"
				},
				"x": {
					"u": "\u03c7",
					"c": "χ"
				},
				"y": {
					"u": "\u0443",
					"c": "у"
				},
				"?": {
					"u": "\u061f",
					"c": "؟"
				},
				"*": {
					"u": "\u25cf",
					"c": "●"
				},
				"<": {
					"u": "\u00ab",
					"c": "«"
				},
				">": {
					"u": "\u00bb",
					"c": "»"
				}
			}
		},
		{
			"name": "Haxxor",
			"info": {
				name: "Wikipedia",
				link: "http://en.wikipedia.org/wiki/Leet"
			},
			"lowercase": true,
			"entries": {
				"a": {
					"u": "\u0034",
					"c": "4"
				},
				"b": {
					"u": "\u0038",
					"c": "8"
				},
				"c": {
					"u": "\u0028",
					"c": "("
				},
				"e": {
					"u": "\u0033",
					"c": "3"
				},
				"g": {
					"u": "\u0039",
					"c": "9"
				},
				"i": {
					"u": "\u0021",
					"c": "!"
				},
				"l": {
					"u": "\u0031",
					"c": "1"
				},
				"o": {
					"u": "\u0030",
					"c": "0"
				},
				"s": {
					"u": "\u0035",
					"c": "5"
				},
				"t": {
					"u": "\u0037",
					"c": "7"
				},
				"z": {
					"u": "\u0032",
					"c": "2"
				}
			}
		},
		{
			"name": "Div",
			"lowercase": true,
			"entries": {
				"a": {
					"u": "\u00c1",
					"c": "Á"
				},
				"b": {
					"u": "\u00df",
					"c": "ß"
				},
				"c": {
					"u": "\u010c",
					"c": "Č"
				},
				"d": {
					"u": "\u010e",
					"c": "Ď"
				},
				"e": {
					"u": "\u0114",
					"c": "Ĕ"
				},
				"f": {
					"u": "\u0166",
					"c": "Ŧ"
				},
				"g": {
					"u": "\u011e",
					"c": "Ğ"
				},
				"h": {
					"u": "\u0124",
					"c": "Ĥ"
				},
				"i": {
					"u": "\u0128",
					"c": "Ĩ"
				},
				"j": {
					"u": "\u0134",
					"c": "Ĵ"
				},
				"k": {
					"u": "\u0136",
					"c": "Ķ"
				},
				"l": {
					"u": "\u0139",
					"c": "Ĺ"
				},
				"m": {
					"u": "\u041c",
					"c": "М"
				},
				"n": {
					"u": "\u0143",
					"c": "Ń"
				},
				"o": {
					"u": "\u0150",
					"c": "Ő"
				},
				"p": {
					"u": "\u0420",
					"c": "Р"
				},
				"q": {
					"u": "\u0051",
					"c": "Q"
				},
				"r": {
					"u": "\u0154",
					"c": "Ŕ"
				},
				"s": {
					"u": "\u015a",
					"c": "Ś"
				},
				"t": {
					"u": "\u0164",
					"c": "Ť"
				},
				"u": {
					"u": "\u00da",
					"c": "Ú"
				},
				"v": {
					"u": "\u0056",
					"c": "V"
				},
				"w": {
					"u": "\u0174",
					"c": "Ŵ"
				},
				"x": {
					"u": "\u0416",
					"c": "Ж"
				},
				"y": {
					"u": "\u0176",
					"c": "Ŷ"
				},
				"z": {
					"u": "\u0179",
					"c": "Ź"
				},
				"?": {
					"u": "\u061f",
					"c": "؟"
				},
				"*": {
					"u": "\u25cf",
					"c": "●"
				},
				"<": {
					"u": "\u00ab",
					"c": "«"
				},
				">": {
					"u": "\u00bb",
					"c": "»"
				}
			}
		},
		{
			"name": "Arab",
			"lowercase": true,
			"entries": {
				"a": {
					"u": "\u0e04",
					"c": "ค"
				},
				"b": {
					"u": "\u0e52",
					"c": "๒"
				},
				"c": {
					"u": "\u03c2",
					"c": "ς"
				},
				"d": {
					"u": "\u0e54",
					"c": "๔"
				},
				"e": {
					"u": "\u0454",
					"c": "є"
				},
				"f": {
					"u": "\u0166",
					"c": "Ŧ"
				},
				"g": {
					"u": "\ufeee",
					"c": "ﻮ"
				},
				"h": {
					"u": "\u0452",
					"c": "ђ"
				},
				"i": {
					"u": "\u0e40",
					"c": "เ"
				},
				"j": {
					"u": "\u05df",
					"c": "ן"
				},
				"k": {
					"u": "\u043a",
					"c": "к"
				},
				"m": {
					"u": "\u0e53",
					"c": "๓"
				},
				"n": {
					"u": "\u0e20",
					"c": "ภ"
				},
				"o": {
					"u": "\u0e4f",
					"c": "๏"
				},
				"p": {
					"u": "\u05e7",
					"c": "ק"
				},
				"q": {
					"u": "\u1ee3",
					"c": "ợ"
				},
				"r": {
					"u": "\u0433",
					"c": "г"
				},
				"s": {
					"u": "\u0e23",
					"c": "ร"
				},
				"u": {
					"u": "\u0e22",
					"c": "ย"
				},
				"v": {
					"u": "\u05e9",
					"c": "ש"
				},
				"w": {
					"u": "\u0e2c",
					"c": "ฬ"
				},
				"x": {
					"u": "\u05e5",
					"c": "ץ"
				},
				"y": {
					"u": "\u05d0",
					"c": "א"
				},
				"?": {
					"u": "\u061f",
					"c": "؟"
				},
				"*": {
					"u": "\u25cf",
					"c": "●"
				},
				"<": {
					"u": "\u00ab",
					"c": "«"
				},
				">": {
					"u": "\u00bb",
					"c": "»"
				}
			}
		},
		{
			"name": "Azak",
			"lowercase": true,
			"entries": {
				"a": {
					"u": "\u00e4",
					"c": "ä"
				},
				"c": {
					"u": "\u010b",
					"c": "ċ"
				},
				"e": {
					"u": "\u00eb",
					"c": "ë"
				},
				"g": {
					"u": "\u0121",
					"c": "ġ"
				},
				"i": {
					"u": "\u00ef",
					"c": "ï"
				},
				"o": {
					"u": "\u00f6",
					"c": "ö"
				},
				"u": {
					"u": "\u00fc",
					"c": "ü"
				},
				"y": {
					"u": "\u00ff",
					"c": "ÿ"
				},
				"z": {
					"u": "\u017c",
					"c": "ż"
				}
			}
		},
		{
			"name": "Stripe",
			"lowercase": true,
			"entries": {
				"a": {
					"u": "\u00e1",
					"c": "á"
				},
				"c": {
					"u": "\u0107",
					"c": "ć"
				},
				"e": {
					"u": "\u00e9",
					"c": "é"
				},
				"i": {
					"u": "\u00ed",
					"c": "í"
				},
				"n": {
					"u": "\u0144",
					"c": "ń"
				},
				"o": {
					"u": "\u0151",
					"c": "ő"
				},
				"r": {
					"u": "\u0155",
					"c": "ŕ"
				},
				"s": {
					"u": "\u015b",
					"c": "ś"
				},
				"u": {
					"u": "\u00fa",
					"c": "ú"
				},
				"y": {
					"u": "\u00fd",
					"c": "ý"
				},
				"z": {
					"u": "\u017a",
					"c": "ź"
				}
			}
		},
		{
			"name": "Spike",
			"lowercase": true,
			"entries": {
				"a": {
					"u": "\u039b",
					"c": "Λ"
				},
				"b": {
					"u": "\u0042",
					"c": "B"
				},
				"c": {
					"u": "\u1103",
					"c": "ᄃ"
				},
				"d": {
					"u": "\u0044",
					"c": "D"
				},
				"e": {
					"u": "\u03a3",
					"c": "Σ"
				},
				"f": {
					"u": "\u0046",
					"c": "F"
				},
				"g": {
					"u": "\u0047",
					"c": "G"
				},
				"h": {
					"u": "\u0389",
					"c": "Ή"
				},
				"i": {
					"u": "\u0049",
					"c": "I"
				},
				"j": {
					"u": "\u004a",
					"c": "J"
				},
				"k": {
					"u": "\u039a",
					"c": "Κ"
				},
				"l": {
					"u": "\u1102",
					"c": "ᄂ"
				},
				"m": {
					"u": "\u004d",
					"c": "M"
				},
				"n": {
					"u": "\u041f",
					"c": "П"
				},
				"o": {
					"u": "\u04e8",
					"c": "Ө"
				},
				"p": {
					"u": "\u0050",
					"c": "P"
				},
				"q": {
					"u": "\u0051",
					"c": "Q"
				},
				"r": {
					"u": "\u042f",
					"c": "Я"
				},
				"s": {
					"u": "\u01a7",
					"c": "Ƨ"
				},
				"t": {
					"u": "\u01ac",
					"c": "Ƭ"
				},
				"u": {
					"u": "\u0426",
					"c": "Ц"
				},
				"v": {
					"u": "\u0056",
					"c": "V"
				},
				"w": {
					"u": "\u0429",
					"c": "Щ"
				},
				"x": {
					"u": "\u0058",
					"c": "X"
				},
				"y": {
					"u": "\u03a5",
					"c": "Υ"
				},
				"z": {
					"u": "\u005a",
					"c": "Z"
				},
				"<": {
					"u": "\u25c1",
					"c": "◁"
				},
				">": {
					"u": "\u25b7",
					"c": "▷"
				}
			}
		},
		{
			"name": "Curvy",
			"lowercase": true,
			"entries": {
				"a": {
					"u": "\u0E04",
					"c": "ค"
				},
				"b": {
					"u": "\u0E52",
					"c": "๒"
				},
				"c": {
					"u": "\u0188",
					"c": "ƈ"
				},
				"d": {
					"u": "\u0257",
					"c": "ɗ"
				},
				"e": {
					"u": "\uFEC9",
					"c": "ﻉ"
				},
				"f": {
					"u": "\u093F",
					"c": "ि"
				},
				"g": {
					"u": "\uFEED",
					"c": "ﻭ"
				},
				"h": {
					"u": "\u0266",
					"c": "ɦ"
				},
				"i": {
					"u": "\u0671",
					"c": "ٱ"
				},
				"j": {
					"u": "\uFEDD",
					"c": "ﻝ"
				},
				"k": {
					"u": "\u16D5",
					"c": "ᛕ"
				},
				"l": {
					"u": "\u026D",
					"c": "ɭ"
				},
				"m": {
					"u": "\u0E53",
					"c": "๓"
				},
				"n": {
					"u": "\u0E01",
					"c": "ก"
				},
				"o": {
					"u": "\u047B",
					"c": "ѻ"
				},
				"p": {
					"u": "\u03C1",
					"c": "ρ"
				},
				"q": {
					"u": "\u06F9",
					"c": "۹"
				},
				"r": {
					"u": "\u027C",
					"c": "ɼ"
				},
				"s": {
					"u": "\u0E23",
					"c": "ร"
				},
				"t": {
					"u": "\u0547",
					"c": "Շ"
				},
				"u": {
					"u": "\u0AAA",
					"c": "પ"
				},
				"v": {
					"u": "\u06F7",
					"c": "۷"
				},
				"w": {
					"u": "\u0E1D",
					"c": "ฝ"
				},
				"x": {
					"u": "\u0E0B",
					"c": "ซ"
				},
				"y": {
					"u": "\u05E5",
					"c": "ץ"
				},
				"z": {
					"u": "\u0579",
					"c": "չ"
				}
			}
		},
		{
			"name": "Curvy 2",
			"lowercase": true,
			"entries": {
				"a": {
					"u": "\u03B1",
					"c": "α"
				},
				"b": {
					"u": "\u0432",
					"c": "в"
				},
				"c": {
					"u": "\u00A2",
					"c": "¢"
				},
				"d": {
					"u": "\u2202",
					"c": "∂"
				},
				"e": {
					"u": "\u0454",
					"c": "є"
				},
				"f": {
					"u": "\u0192",
					"c": "ƒ"
				},
				"g": {
					"u": "\uFEED",
					"c": "ﻭ"
				},
				"h": {
					"u": "\u043D",
					"c": "н"
				},
				"i": {
					"u": "\u03B9",
					"c": "ι"
				},
				"j": {
					"u": "\u05E0",
					"c": "נ"
				},
				"k": {
					"u": "\u043A",
					"c": "к"
				},
				"l": {
					"u": "\u2113",
					"c": "ℓ"
				},
				"m": {
					"u": "\u043C",
					"c": "м"
				},
				"n": {
					"u": "\u03B7",
					"c": "η"
				},
				"o": {
					"u": "\u03C3",
					"c": "σ"
				},
				"p": {
					"u": "\u03C1",
					"c": "ρ"
				},
				"q": {
					"u": "\u06F9",
					"c": "۹"
				},
				"r": {
					"u": "\u044F",
					"c": "я"
				},
				"t": {
					"u": "\u0442",
					"c": "т"
				},
				"u": {
					"u": "\u03C5",
					"c": "υ"
				},
				"v": {
					"u": "\u03BD",
					"c": "ν"
				},
				"w": {
					"u": "\u03C9",
					"c": "ω"
				},
				"x": {
					"u": "\u03C7",
					"c": "χ"
				},
				"z": {
					"u": "\u0579",
					"c": "չ"
				}
			}
		},
		{
			"name": "Curvy 3",
			"lowercase": true,
			"entries": {
				"a": {
					"u": "\u0E04",
					"c": "ค"
				},
				"b": {
					"u": "\u0E52",
					"c": "๒"
				},
				"c": {
					"u": "\u03C2",
					"c": "ς"
				},
				"d": {
					"u": "\u0E54",
					"c": "๔"
				},
				"e": {
					"u": "\u0454",
					"c": "є"
				},
				"f": {
					"u": "\u0166",
					"c": "Ŧ"
				},
				"g": {
					"u": "\uFEEE",
					"c": "ﻮ"
				},
				"h": {
					"u": "\u0452",
					"c": "ђ"
				},
				"i": {
					"u": "\u0E40",
					"c": "เ"
				},
				"j": {
					"u": "\u05DF",
					"c": "ן"
				},
				"k": {
					"u": "\u043A",
					"c": "к"
				},
				"l": {
					"u": "\u026D",
					"c": "ɭ"
				},
				"m": {
					"u": "\u0E53",
					"c": "๓"
				},
				"n": {
					"u": "\u0E20",
					"c": "ภ"
				},
				"o": {
					"u": "\u0E4F",
					"c": "๏"
				},
				"p": {
					"u": "\u05E7",
					"c": "ק"
				},
				"q": {
					"u": "\u1EE3",
					"c": "ợ"
				},
				"r": {
					"u": "\u0433",
					"c": "г"
				},
				"s": {
					"u": "\u0E23",
					"c": "ร"
				},
				"t": {
					"u": "\u0547",
					"c": "Շ"
				},
				"u": {
					"u": "\u0E22",
					"c": "ย"
				},
				"v": {
					"u": "\u05E9",
					"c": "ש"
				},
				"w": {
					"u": "\u0E2C",
					"c": "ฬ"
				},
				"x": {
					"u": "\u05D0",
					"c": "א"
				},
				"y": {
					"u": "\u05E5",
					"c": "ץ"
				},
				"z": {
					"u": "\u0579",
					"c": "չ"
				}
			}
		},
		{
			"name": "Rock",
			"entries": {
				"3": {
					"u": "\u04DF",
					"c": "ӟ"
				},
				"A": {
					"u": "\u00C4",
					"c": "Ä"
				},
				"B": {
					"u": "\u1E04",
					"c": "Ḅ"
				},
				"C": {
					"u": "\u010A",
					"c": "Ċ"
				},
				"D": {
					"u": "\u1E0A",
					"c": "Ḋ"
				},
				"E": {
					"u": "\u0401",
					"c": "Ё"
				},
				"F": {
					"u": "\u1E1E",
					"c": "Ḟ"
				},
				"G": {
					"u": "\u0120",
					"c": "Ġ"
				},
				"H": {
					"u": "\u1E26",
					"c": "Ḧ"
				},
				"I": {
					"u": "\u0407",
					"c": "Ї"
				},
				"K": {
					"u": "\u1E32",
					"c": "Ḳ"
				},
				"L": {
					"u": "\u1E36",
					"c": "Ḷ"
				},
				"M": {
					"u": "\u1E40",
					"c": "Ṁ"
				},
				"N": {
					"u": "\u1E44",
					"c": "Ṅ"
				},
				"O": {
					"u": "\u00D6",
					"c": "Ö"
				},
				"P": {
					"u": "\u1E56",
					"c": "Ṗ"
				},
				"R": {
					"u": "\u1E5A",
					"c": "Ṛ"
				},
				"S": {
					"u": "\u1E60",
					"c": "Ṡ"
				},
				"T": {
					"u": "\u1E6A",
					"c": "Ṫ"
				},
				"U": {
					"u": "\u00DC",
					"c": "Ü"
				},
				"V": {
					"u": "\u1E7E",
					"c": "Ṿ"
				},
				"W": {
					"u": "\u1E84",
					"c": "Ẅ"
				},
				"X": {
					"u": "\u1E8C",
					"c": "Ẍ"
				},
				"Y": {
					"u": "\u0178",
					"c": "Ÿ"
				},
				"Z": {
					"u": "\u017B",
					"c": "Ż"
				},
				"a": {
					"u": "\u00E4",
					"c": "ä"
				},
				"b": {
					"u": "\u1E05",
					"c": "ḅ"
				},
				"c": {
					"u": "\u010B",
					"c": "ċ"
				},
				"d": {
					"u": "\u1E0B",
					"c": "ḋ"
				},
				"e": {
					"u": "\u00EB",
					"c": "ë"
				},
				"f": {
					"u": "\u1E1F",
					"c": "ḟ"
				},
				"g": {
					"u": "\u0121",
					"c": "ġ"
				},
				"h": {
					"u": "\u1E27",
					"c": "ḧ"
				},
				"i": {
					"u": "\u00EF",
					"c": "ï"
				},
				"k": {
					"u": "\u1E33",
					"c": "ḳ"
				},
				"l": {
					"u": "\u1E37",
					"c": "ḷ"
				},
				"m": {
					"u": "\u1E41",
					"c": "ṁ"
				},
				"n": {
					"u": "\u1E45",
					"c": "ṅ"
				},
				"o": {
					"u": "\u00F6",
					"c": "ö"
				},
				"p": {
					"u": "\u1E57",
					"c": "ṗ"
				},
				"r": {
					"u": "\u1E5B",
					"c": "ṛ"
				},
				"s": {
					"u": "\u1E61",
					"c": "ṡ"
				},
				"t": {
					"u": "\u1E97",
					"c": "ẗ"
				},
				"u": {
					"u": "\u00FC",
					"c": "ü"
				},
				"v": {
					"u": "\u1E7F",
					"c": "ṿ"
				},
				"w": {
					"u": "\u1E85",
					"c": "ẅ"
				},
				"x": {
					"u": "\u1E8D",
					"c": "ẍ"
				},
				"y": {
					"u": "\u00FF",
					"c": "ÿ"
				},
				"z": {
					"u": "\u017C",
					"c": "ż"
				}
			}
		},
		{
			"name": "A Cute",
			"entries": {
				"A": {
					"u": "\u00C1",
					"c": "Á"
				},
				"C": {
					"u": "\u0106",
					"c": "Ć"
				},
				"E": {
					"u": "\u00C9",
					"c": "É"
				},
				"G": {
					"u": "\u01F4",
					"c": "Ǵ"
				},
				"I": {
					"u": "\u00ED",
					"c": "í"
				},
				"K": {
					"u": "\u1E30",
					"c": "Ḱ"
				},
				"L": {
					"u": "\u0139",
					"c": "Ĺ"
				},
				"M": {
					"u": "\u1E3E",
					"c": "Ḿ"
				},
				"N": {
					"u": "\u0143",
					"c": "Ń"
				},
				"O": {
					"u": "\u0150",
					"c": "Ő"
				},
				"P": {
					"u": "\u1E54",
					"c": "Ṕ"
				},
				"R": {
					"u": "\u0154",
					"c": "Ŕ"
				},
				"S": {
					"u": "\u015B",
					"c": "ś"
				},
				"U": {
					"u": "\u0170",
					"c": "Ű"
				},
				"W": {
					"u": "\u1E82",
					"c": "Ẃ"
				},
				"Y": {
					"u": "\u04F2",
					"c": "Ӳ"
				},
				"Z": {
					"u": "\u0179",
					"c": "Ź"
				},
				"a": {
					"u": "\u00E1",
					"c": "á"
				},
				"c": {
					"u": "\u0107",
					"c": "ć"
				},
				"e": {
					"u": "\u00E9",
					"c": "é"
				},
				"g": {
					"u": "\u01F5",
					"c": "ǵ"
				},
				"i": {
					"u": "\u00ED",
					"c": "í"
				},
				"k": {
					"u": "\u1E31",
					"c": "ḱ"
				},
				"l": {
					"u": "\u013A",
					"c": "ĺ"
				},
				"m": {
					"u": "\u1E3F",
					"c": "ḿ"
				},
				"n": {
					"u": "\u0144",
					"c": "ń"
				},
				"o": {
					"u": "\u0151",
					"c": "ő"
				},
				"p": {
					"u": "\u1E55",
					"c": "ṕ"
				},
				"r": {
					"u": "\u0155",
					"c": "ŕ"
				},
				"s": {
					"u": "\u015B",
					"c": "ś"
				},
				"u": {
					"u": "\u00FA",
					"c": "ú"
				},
				"w": {
					"u": "\u1E83",
					"c": "ẃ"
				},
				"y": {
					"u": "\u04F3",
					"c": "ӳ"
				},
				"z": {
					"u": "\u017A",
					"c": "ź"
				}
			}
		},
		{
			"name": "Bol",
			"lowercase": true,
			"entries": {
				"a": {
					"u": "\uff91",
					"c": "ﾑ"
				},
				"b": {
					"u": "\u4e43",
					"c": "乃"
				},
				"e": {
					"u": "\u4e47",
					"c": "乇"
				},
				"f": {
					"u": "\uff77",
					"c": "ｷ"
				},
				"h": {
					"u": "\u3093",
					"c": "ん"
				},
				"i": {
					"u": "\uff89",
					"c": "ﾉ"
				},
				"j": {
					"u": "\uff8c",
					"c": "ﾌ"
				},
				"k": {
					"u": "\u30ba",
					"c": "ズ"
				},
				"l": {
					"u": "\uff9a",
					"c": "ﾚ"
				},
				"m": {
					"u": "\uffb6",
					"c": "ﾶ"
				},
				"n": {
					"u": "\u5200",
					"c": "刀"
				},
				"p": {
					"u": "\uff71",
					"c": "ｱ"
				},
				"r": {
					"u": "\u5c3a",
					"c": "尺"
				},
				"s": {
					"u": "\u4e02",
					"c": "丂"
				},
				"t": {
					"u": "\uff72",
					"c": "ｲ"
				},
				"v": {
					"u": "\u221a",
					"c": "√"
				},
				"x": {
					"u": "\uff92",
					"c": "ﾒ"
				},
				"y": {
					"u": "\uff98",
					"c": "ﾘ"
				},
				"z": {
					"u": "\u4e59",
					"c": "乙"
				}
			}
		},
		{
			"name": "Strike",
			"entries": {
				"2": {
					"u": "\u01BB",
					"c": "ƻ"
				},
				"A": {
					"u": "\u023A",
					"c": "Ⱥ"
				},
				"B": {
					"u": "\u0243",
					"c": "Ƀ"
				},
				"C": {
					"u": "\u023B",
					"c": "Ȼ"
				},
				"D": {
					"u": "\u0110",
					"c": "Đ"
				},
				"E": {
					"u": "\u0246",
					"c": "Ɇ"
				},
				"G": {
					"u": "\u01E4",
					"c": "Ǥ"
				},
				"H": {
					"u": "\u0126",
					"c": "Ħ"
				},
				"I": {
					"u": "\u0197",
					"c": "Ɨ"
				},
				"J": {
					"u": "\u0248",
					"c": "Ɉ"
				},
				"K": {
					"u": "\uA740",
					"c": "Ꝁ"
				},
				"L": {
					"u": "\u0141",
					"c": "Ł"
				},
				"O": {
					"u": "\u00D8",
					"c": "Ø"
				},
				"P": {
					"u": "\u2C63",
					"c": "Ᵽ"
				},
				"Q": {
					"u": "\uA756",
					"c": "Ꝗ"
				},
				"R": {
					"u": "\u024C",
					"c": "Ɍ"
				},
				"T": {
					"u": "\u0166",
					"c": "Ŧ"
				},
				"U": {
					"u": "\u1D7E",
					"c": "ᵾ"
				},
				"Y": {
					"u": "\u024E",
					"c": "Ɏ"
				},
				"Z": {
					"u": "\u01B5",
					"c": "Ƶ"
				},
				"a": {
					"u": "\u023A",
					"c": "Ⱥ"
				},
				"b": {
					"u": "\u0180",
					"c": "ƀ"
				},
				"c": {
					"u": "\u023C",
					"c": "ȼ"
				},
				"d": {
					"u": "\u0111",
					"c": "đ"
				},
				"e": {
					"u": "\u0247",
					"c": "ɇ"
				},
				"g": {
					"u": "\u01E5",
					"c": "ǥ"
				},
				"h": {
					"u": "\u0127",
					"c": "ħ"
				},
				"i": {
					"u": "\u0268",
					"c": "ɨ"
				},
				"j": {
					"u": "\u0249",
					"c": "ɉ"
				},
				"k": {
					"u": "\uA741",
					"c": "ꝁ"
				},
				"l": {
					"u": "\u0142",
					"c": "ł"
				},
				"o": {
					"u": "\u00F8",
					"c": "ø"
				},
				"p": {
					"u": "\u1D7D",
					"c": "ᵽ"
				},
				"q": {
					"u": "\uA757",
					"c": "ꝗ"
				},
				"r": {
					"u": "\u024D",
					"c": "ɍ"
				},
				"t": {
					"u": "\u0167",
					"c": "ŧ"
				},
				"u": {
					"u": "\u1D7E",
					"c": "ᵾ"
				},
				"y": {
					"u": "\u024F",
					"c": "ɏ"
				},
				"z": {
					"u": "\u01B6",
					"c": "ƶ"
				}
			}
		},
		{
			"name": "CJK+Thai",
			"entries": {
				"A": {
					"u": "\uFF91",
					"c": "ﾑ"
				},
				"B": {
					"u": "\u4E43",
					"c": "乃"
				},
				"C": {
					"u": "c",
					"c": "c"
				},
				"D": {
					"u": "d",
					"c": "d"
				},
				"E": {
					"u": "\u4E47",
					"c": "乇"
				},
				"F": {
					"u": "\uFF77",
					"c": "ｷ"
				},
				"G": {
					"u": "g",
					"c": "g"
				},
				"H": {
					"u": "\u3093",
					"c": "ん"
				},
				"I": {
					"u": "\uFF89",
					"c": "ﾉ"
				},
				"J": {
					"u": "\uFF8C",
					"c": "ﾌ"
				},
				"K": {
					"u": "\u30BA",
					"c": "ズ"
				},
				"L": {
					"u": "\uFF9A",
					"c": "ﾚ"
				},
				"M": {
					"u": "\uFFB6",
					"c": "ﾶ"
				},
				"N": {
					"u": "\u5200",
					"c": "刀"
				},
				"O": {
					"u": "o",
					"c": "o"
				},
				"P": {
					"u": "\uFF71",
					"c": "ｱ"
				},
				"Q": {
					"u": "q",
					"c": "q"
				},
				"R": {
					"u": "\u5C3A",
					"c": "尺"
				},
				"S": {
					"u": "\u4E02",
					"c": "丂"
				},
				"T": {
					"u": "\uFF72",
					"c": "ｲ"
				},
				"U": {
					"u": "u",
					"c": "u"
				},
				"V": {
					"u": "\u221A",
					"c": "√"
				},
				"W": {
					"u": "w",
					"c": "w"
				},
				"X": {
					"u": "\uFF92",
					"c": "ﾒ"
				},
				"Y": {
					"u": "\uFF98",
					"c": "ﾘ"
				},
				"Z": {
					"u": "\u4E59",
					"c": "乙"
				},
				"a": {
					"u": "\uFF91",
					"c": "ﾑ"
				},
				"b": {
					"u": "\u4E43",
					"c": "乃"
				},
				"e": {
					"u": "\u4E47",
					"c": "乇"
				},
				"f": {
					"u": "\uFF77",
					"c": "ｷ"
				},
				"h": {
					"u": "\u3093",
					"c": "ん"
				},
				"i": {
					"u": "\uFF89",
					"c": "ﾉ"
				},
				"j": {
					"u": "\uFF8C",
					"c": "ﾌ"
				},
				"k": {
					"u": "\u30BA",
					"c": "ズ"
				},
				"l": {
					"u": "\uFF9A",
					"c": "ﾚ"
				},
				"m": {
					"u": "\uFFB6",
					"c": "ﾶ"
				},
				"n": {
					"u": "\u5200",
					"c": "刀"
				},
				"p": {
					"u": "\uFF71",
					"c": "ｱ"
				},
				"r": {
					"u": "\u5C3A",
					"c": "尺"
				},
				"s": {
					"u": "\u4E02",
					"c": "丂"
				},
				"t": {
					"u": "\uFF72",
					"c": "ｲ"
				},
				"v": {
					"u": "\u221A",
					"c": "√"
				},
				"x": {
					"u": "\uFF92",
					"c": "ﾒ"
				},
				"y": {
					"u": "\uFF98",
					"c": "ﾘ"
				},
				"z": {
					"u": "\u4E59",
					"c": "乙"
				}
			}
		},
		{
			"name": "Faux Cyrillic",
			info: {
				name: 'Wikipedia',
				link: "http://en.wikipedia.org/wiki/Faux_Cyrillic"
			},
			"entries": {
				"A": {
					"u": "\u0414",
					"c": "Д"
				},
				"B": {
					"u": "\u0411",
					"c": "Б"
				},
				"C": {
					"u": "\u0480",
					"c": "Ҁ"
				},
				"D": {
					"u": "\u2181",
					"c": "ↁ"
				},
				"E": {
					"u": "\u0404",
					"c": "Є"
				},
				"G": {
					"u": "\u0411",
					"c": "Б"
				},
				"H": {
					"u": "\u041D",
					"c": "Н"
				},
				"I": {
					"u": "\u0406",
					"c": "І"
				},
				"J": {
					"u": "\u0408",
					"c": "Ј"
				},
				"K": {
					"u": "\u040C",
					"c": "Ќ"
				},
				"M": {
					"u": "\u041C",
					"c": "М"
				},
				"N": {
					"u": "\u0418",
					"c": "И"
				},
				"O": {
					"u": "\u0424",
					"c": "Ф"
				},
				"R": {
					"u": "\u042F",
					"c": "Я"
				},
				"T": {
					"u": "\u0413",
					"c": "Г"
				},
				"U": {
					"u": "\u0426",
					"c": "Ц"
				},
				"W": {
					"u": "\u0429",
					"c": "Щ"
				},
				"X": {
					"u": "\u0416",
					"c": "Ж"
				},
				"Y": {
					"u": "\u0427",
					"c": "Ч"
				},
				"b": {
					"u": "\u044A",
					"c": "ъ"
				},
				"d": {
					"u": "\u2181",
					"c": "ↁ"
				},
				"e": {
					"u": "\u044D",
					"c": "э"
				},
				"g": {
					"u": "\u0411",
					"c": "Б"
				},
				"h": {
					"u": "\u0402",
					"c": "Ђ"
				},
				"k": {
					"u": "\u043A",
					"c": "к"
				},
				"m": {
					"u": "\u043C",
					"c": "м"
				},
				"n": {
					"u": "\u0438",
					"c": "и"
				},
				"r": {
					"u": "\u0453",
					"c": "ѓ"
				},
				"t": {
					"u": "\u0442",
					"c": "т"
				},
				"u": {
					"u": "\u0446",
					"c": "ц"
				},
				"w": {
					"u": "\u0448",
					"c": "ш"
				},
				"y": {
					"u": "\u040E",
					"c": "Ў"
				}
			}
		},
		{
			"name": "Smallbol",
			"entries": {
				"1": {
					"u": "\u2460",
					"c": "①"
				},
				"2": {
					"u": "\u2461",
					"c": "②"
				},
				"3": {
					"u": "\u2462",
					"c": "③"
				},
				"4": {
					"u": "\u2463",
					"c": "④"
				},
				"5": {
					"u": "\u2464",
					"c": "⑤"
				},
				"6": {
					"u": "\u2465",
					"c": "⑥"
				},
				"7": {
					"u": "\u2466",
					"c": "⑦"
				},
				"8": {
					"u": "\u2467",
					"c": "⑧"
				},
				"9": {
					"u": "\u2468",
					"c": "⑨"
				},
				"A": {
					"u": "\u24b6",
					"c": "Ⓐ"
				},
				"B": {
					"u": "\u24b7",
					"c": "Ⓑ"
				},
				"C": {
					"u": "\u24b8",
					"c": "Ⓒ"
				},
				"D": {
					"u": "\u24b9",
					"c": "Ⓓ"
				},
				"E": {
					"u": "\u24ba",
					"c": "Ⓔ"
				},
				"F": {
					"u": "\u24bb",
					"c": "Ⓕ"
				},
				"G": {
					"u": "\u24bc",
					"c": "Ⓖ"
				},
				"H": {
					"u": "\u24bd",
					"c": "Ⓗ"
				},
				"I": {
					"u": "\u24be",
					"c": "Ⓘ"
				},
				"J": {
					"u": "\u24bf",
					"c": "Ⓙ"
				},
				"K": {
					"u": "\u24c0",
					"c": "Ⓚ"
				},
				"L": {
					"u": "\u24c1",
					"c": "Ⓛ"
				},
				"M": {
					"u": "\u24c2",
					"c": "Ⓜ"
				},
				"N": {
					"u": "\u24c3",
					"c": "Ⓝ"
				},
				"O": {
					"u": "\u24c4",
					"c": "Ⓞ"
				},
				"P": {
					"u": "\u24c5",
					"c": "Ⓟ"
				},
				"Q": {
					"u": "\u24c6",
					"c": "Ⓠ"
				},
				"R": {
					"u": "\u24c7",
					"c": "Ⓡ"
				},
				"S": {
					"u": "\u24c8",
					"c": "Ⓢ"
				},
				"T": {
					"u": "\u24c9",
					"c": "Ⓣ"
				},
				"U": {
					"u": "\u24ca",
					"c": "Ⓤ"
				},
				"V": {
					"u": "\u24cb",
					"c": "Ⓥ"
				},
				"W": {
					"u": "\u24cc",
					"c": "Ⓦ"
				},
				"X": {
					"u": "\u24cd",
					"c": "Ⓧ"
				},
				"Y": {
					"u": "\u24ce",
					"c": "Ⓨ"
				},
				"Z": {
					"u": "\u24cf",
					"c": "Ⓩ"
				},
				"a": {
					"u": "\u24d0",
					"c": "ⓐ"
				},
				"b": {
					"u": "\u24d1",
					"c": "ⓑ"
				},
				"c": {
					"u": "\u24d2",
					"c": "ⓒ"
				},
				"d": {
					"u": "\u24d3",
					"c": "ⓓ"
				},
				"e": {
					"u": "\u24d4",
					"c": "ⓔ"
				},
				"f": {
					"u": "\u24d5",
					"c": "ⓕ"
				},
				"g": {
					"u": "\u24d6",
					"c": "ⓖ"
				},
				"h": {
					"u": "\u24d7",
					"c": "ⓗ"
				},
				"i": {
					"u": "\u24d8",
					"c": "ⓘ"
				},
				"j": {
					"u": "\u24d9",
					"c": "ⓙ"
				},
				"k": {
					"u": "\u24da",
					"c": "ⓚ"
				},
				"l": {
					"u": "\u24db",
					"c": "ⓛ"
				},
				"m": {
					"u": "\u24dc",
					"c": "ⓜ"
				},
				"n": {
					"u": "\u24dd",
					"c": "ⓝ"
				},
				"o": {
					"u": "\u24de",
					"c": "ⓞ"
				},
				"p": {
					"u": "\u24df",
					"c": "ⓟ"
				},
				"q": {
					"u": "\u24e0",
					"c": "ⓠ"
				},
				"r": {
					"u": "\u24e1",
					"c": "ⓡ"
				},
				"s": {
					"u": "\u24e2",
					"c": "ⓢ"
				},
				"t": {
					"u": "\u24e3",
					"c": "ⓣ"
				},
				"u": {
					"u": "\u24e4",
					"c": "ⓤ"
				},
				"v": {
					"u": "\u24e5",
					"c": "ⓥ"
				},
				"w": {
					"u": "\u24e6",
					"c": "ⓦ"
				},
				"x": {
					"u": "\u24e7",
					"c": "ⓧ"
				},
				"y": {
					"u": "\u24e8",
					"c": "ⓨ"
				},
				"z": {
					"u": "\u24e9",
					"c": "ⓩ"
				},
				"*": {
					"u": "\u229b",
					"c": "⊛"
				},
				".": {
					"u": "\u0e4f",
					"c": "๏"
				},
				"=": {
					"u": "\u229c",
					"c": "⊜"
				},
				"+": {
					"u": "\u2295",
					"c": "⊕"
				},
				"-": {
					"u": "\u229d",
					"c": "⊝"
				}
			}
		},
		{
			"name": "Parenthesized",
			"lowercase": true,
			"entries": {
				"1": {
					"u": "\u2474",
					"c": "⑴"
				},
				"2": {
					"u": "\u2475",
					"c": "⑵"
				},
				"3": {
					"u": "\u2476",
					"c": "⑶"
				},
				"4": {
					"u": "\u2477",
					"c": "⑷"
				},
				"5": {
					"u": "\u2478",
					"c": "⑸"
				},
				"6": {
					"u": "\u2479",
					"c": "⑹"
				},
				"7": {
					"u": "\u247a",
					"c": "⑺"
				},
				"8": {
					"u": "\u247b",
					"c": "⑻"
				},
				"9": {
					"u": "\u247c",
					"c": "⑼"
				},
				"a": {
					"u": "\u249c",
					"c": "⒜"
				},
				"b": {
					"u": "\u249d",
					"c": "⒝"
				},
				"c": {
					"u": "\u249e",
					"c": "⒞"
				},
				"d": {
					"u": "\u249f",
					"c": "⒟"
				},
				"e": {
					"u": "\u24a0",
					"c": "⒠"
				},
				"f": {
					"u": "\u24a1",
					"c": "⒡"
				},
				"g": {
					"u": "\u24a2",
					"c": "⒢"
				},
				"h": {
					"u": "\u24a3",
					"c": "⒣"
				},
				"i": {
					"u": "\u24a4",
					"c": "⒤"
				},
				"j": {
					"u": "\u24a5",
					"c": "⒥"
				},
				"k": {
					"u": "\u24a6",
					"c": "⒦"
				},
				"l": {
					"u": "\u24a7",
					"c": "⒧"
				},
				"m": {
					"u": "\u24a8",
					"c": "⒨"
				},
				"n": {
					"u": "\u24a9",
					"c": "⒩"
				},
				"o": {
					"u": "\u24aa",
					"c": "⒪"
				},
				"p": {
					"u": "\u24ab",
					"c": "⒫"
				},
				"q": {
					"u": "\u24ac",
					"c": "⒬"
				},
				"r": {
					"u": "\u24ad",
					"c": "⒭"
				},
				"s": {
					"u": "\u24ae",
					"c": "⒮"
				},
				"t": {
					"u": "\u24af",
					"c": "⒯"
				},
				"u": {
					"u": "\u24b0",
					"c": "⒰"
				},
				"v": {
					"u": "\u24b1",
					"c": "⒱"
				},
				"w": {
					"u": "\u24b2",
					"c": "⒲"
				},
				"x": {
					"u": "\u24b3",
					"c": "⒳"
				},
				"y": {
					"u": "\u24b4",
					"c": "⒴"
				},
				"z": {
					"u": "\u24b5",
					"c": "⒵"
				}
			}
		},
		{
			"name": "Negative Circled",
			"lowercase": true,
			"entries": {
				"1": {
					"u": "\u2474",
					"c": "⑴"
				},
				"2": {
					"u": "\u2475",
					"c": "⑵"
				},
				"3": {
					"u": "\u2476",
					"c": "⑶"
				},
				"4": {
					"u": "\u2477",
					"c": "⑷"
				},
				"5": {
					"u": "\u2478",
					"c": "⑸"
				},
				"6": {
					"u": "\u2479",
					"c": "⑹"
				},
				"7": {
					"u": "\u247A",
					"c": "⑺"
				},
				"8": {
					"u": "\u247B",
					"c": "⑻"
				},
				"9": {
					"u": "\u247C",
					"c": "⑼"
				},
				"a": {
					"u": "\uD83C\uDD50",
					"c": "🅐"
				},
				"b": {
					"u": "\uD83C\uDD51",
					"c": "🅑"
				},
				"c": {
					"u": "\uD83C\uDD52",
					"c": "🅒"
				},
				"d": {
					"u": "\uD83C\uDD53",
					"c": "🅓"
				},
				"e": {
					"u": "\uD83C\uDD54",
					"c": "🅔"
				},
				"f": {
					"u": "\uD83C\uDD55",
					"c": "🅕"
				},
				"g": {
					"u": "\uD83C\uDD56",
					"c": "🅖"
				},
				"h": {
					"u": "\uD83C\uDD57",
					"c": "🅗"
				},
				"i": {
					"u": "\uD83C\uDD58",
					"c": "🅘"
				},
				"j": {
					"u": "\uD83C\uDD59",
					"c": "🅙"
				},
				"k": {
					"u": "\uD83C\uDD5A",
					"c": "🅚"
				},
				"l": {
					"u": "\uD83C\uDD5B",
					"c": "🅛"
				},
				"m": {
					"u": "\uD83C\uDD5C",
					"c": "🅜"
				},
				"n": {
					"u": "\uD83C\uDD5D",
					"c": "🅝"
				},
				"o": {
					"u": "\uD83C\uDD5E",
					"c": "🅞"
				},
				"p": {
					"u": "\uD83C\uDD5F",
					"c": "🅟"
				},
				"q": {
					"u": "\uD83C\uDD60",
					"c": "🅠"
				},
				"r": {
					"u": "\uD83C\uDD61",
					"c": "🅡"
				},
				"s": {
					"u": "\uD83C\uDD62",
					"c": "🅢"
				},
				"t": {
					"u": "\uD83C\uDD63",
					"c": "🅣"
				},
				"u": {
					"u": "\uD83C\uDD64",
					"c": "🅤"
				},
				"v": {
					"u": "\uD83C\uDD65",
					"c": "🅥"
				},
				"w": {
					"u": "\uD83C\uDD66",
					"c": "🅦"
				},
				"x": {
					"u": "\uD83C\uDD67",
					"c": "🅧"
				},
				"y": {
					"u": "\uD83C\uDD68",
					"c": "🅨"
				},
				"z": {
					"u": "\uD83C\uDD69",
					"c": "🅩"
				}
			}
		},
		{
			"name": "Squared",
			"lowercase": true,
			"entries": {
				"a": {
					"u": "\uD83C\uDD30",
					"c": "🄰"
				},
				"b": {
					"u": "\uD83C\uDD31",
					"c": "🄱"
				},
				"c": {
					"u": "\uD83C\uDD32",
					"c": "🄲"
				},
				"d": {
					"u": "\uD83C\uDD33",
					"c": "🄳"
				},
				"e": {
					"u": "\uD83C\uDD34",
					"c": "🄴"
				},
				"f": {
					"u": "\uD83C\uDD35",
					"c": "🄵"
				},
				"g": {
					"u": "\uD83C\uDD36",
					"c": "🄶"
				},
				"h": {
					"u": "\uD83C\uDD37",
					"c": "🄷"
				},
				"i": {
					"u": "\uD83C\uDD38",
					"c": "🄸"
				},
				"j": {
					"u": "\uD83C\uDD39",
					"c": "🄹"
				},
				"k": {
					"u": "\uD83C\uDD3A",
					"c": "🄺"
				},
				"l": {
					"u": "\uD83C\uDD3B",
					"c": "🄻"
				},
				"m": {
					"u": "\uD83C\uDD3C",
					"c": "🄼"
				},
				"n": {
					"u": "\uD83C\uDD3D",
					"c": "🄽"
				},
				"o": {
					"u": "\uD83C\uDD3E",
					"c": "🄾"
				},
				"p": {
					"u": "\uD83C\uDD3F",
					"c": "🄿"
				},
				"q": {
					"u": "\uD83C\uDD40",
					"c": "🅀"
				},
				"r": {
					"u": "\uD83C\uDD41",
					"c": "🅁"
				},
				"s": {
					"u": "\uD83C\uDD42",
					"c": "🅂"
				},
				"t": {
					"u": "\uD83C\uDD43",
					"c": "🅃"
				},
				"u": {
					"u": "\uD83C\uDD44",
					"c": "🅄"
				},
				"v": {
					"u": "\uD83C\uDD45",
					"c": "🅅"
				},
				"w": {
					"u": "\uD83C\uDD46",
					"c": "🅆"
				},
				"x": {
					"u": "\uD83C\uDD47",
					"c": "🅇"
				},
				"y": {
					"u": "\uD83C\uDD48",
					"c": "🅈"
				},
				"z": {
					"u": "\uD83C\uDD49",
					"c": "🅉"
				}
			}
		},
		{
			"name": "Negative Squared",
			"lowercase": true,
			"entries": {
				"a": {
					"u": "\uD83C\uDD70",
					"c": "🅰"
				},
				"b": {
					"u": "\uD83C\uDD71",
					"c": "🅱"
				},
				"c": {
					"u": "\uD83C\uDD72",
					"c": "🅲"
				},
				"d": {
					"u": "\uD83C\uDD73",
					"c": "🅳"
				},
				"e": {
					"u": "\uD83C\uDD74",
					"c": "🅴"
				},
				"f": {
					"u": "\uD83C\uDD75",
					"c": "🅵"
				},
				"g": {
					"u": "\uD83C\uDD76",
					"c": "🅶"
				},
				"h": {
					"u": "\uD83C\uDD77",
					"c": "🅷"
				},
				"i": {
					"u": "\uD83C\uDD78",
					"c": "🅸"
				},
				"j": {
					"u": "\uD83C\uDD79",
					"c": "🅹"
				},
				"k": {
					"u": "\uD83C\uDD7A",
					"c": "🅺"
				},
				"l": {
					"u": "\uD83C\uDD7B",
					"c": "🅻"
				},
				"m": {
					"u": "\uD83C\uDD7C",
					"c": "🅼"
				},
				"n": {
					"u": "\uD83C\uDD7D",
					"c": "🅽"
				},
				"o": {
					"u": "\uD83C\uDD7E",
					"c": "🅾"
				},
				"p": {
					"u": "\uD83C\uDD7F",
					"c": "🅿"
				},
				"q": {
					"u": "\uD83C\uDD80",
					"c": "🆀"
				},
				"r": {
					"u": "\uD83C\uDD81",
					"c": "🆁"
				},
				"s": {
					"u": "\uD83C\uDD82",
					"c": "🆂"
				},
				"t": {
					"u": "\uD83C\uDD83",
					"c": "🆃"
				},
				"u": {
					"u": "\uD83C\uDD84",
					"c": "🆄"
				},
				"v": {
					"u": "\uD83C\uDD85",
					"c": "🆅"
				},
				"w": {
					"u": "\uD83C\uDD86",
					"c": "🆆"
				},
				"x": {
					"u": "\uD83C\uDD87",
					"c": "🆇"
				},
				"y": {
					"u": "\uD83C\uDD88",
					"c": "🆈"
				},
				"z": {
					"u": "\uD83C\uDD89",
					"c": "🆉"
				}
			}
		},
		{
			"name": "Small",
			"entries": {
				"0": {
					"u": "\u2070",
					"c": "⁰"
				},
				"1": {
					"u": "\u00b9",
					"c": "¹"
				},
				"2": {
					"u": "\u00b2",
					"c": "²"
				},
				"3": {
					"u": "\u00b3",
					"c": "³"
				},
				"4": {
					"u": "\u2074",
					"c": "⁴"
				},
				"5": {
					"u": "\u2075",
					"c": "⁵"
				},
				"6": {
					"u": "\u2076",
					"c": "⁶"
				},
				"7": {
					"u": "\u2077",
					"c": "⁷"
				},
				"8": {
					"u": "\u2078",
					"c": "⁸"
				},
				"9": {
					"u": "\u2079",
					"c": "⁹"
				},
				"A": {
					"u": "\u1d2c",
					"c": "ᴬ"
				},
				"B": {
					"u": "\u1d2e",
					"c": "ᴮ"
				},
				"C": {
					"u": "\u1d9c",
					"c": "ᶜ"
				},
				"D": {
					"u": "\u1d30",
					"c": "ᴰ"
				},
				"E": {
					"u": "\u1d31",
					"c": "ᴱ"
				},
				"F": {
					"u": "\u1da0",
					"c": "ᶠ"
				},
				"G": {
					"u": "\u1d33",
					"c": "ᴳ"
				},
				"H": {
					"u": "\u1d34",
					"c": "ᴴ"
				},
				"I": {
					"u": "\u1d35",
					"c": "ᴵ"
				},
				"J": {
					"u": "\u1d36",
					"c": "ᴶ"
				},
				"K": {
					"u": "\u1d37",
					"c": "ᴷ"
				},
				"L": {
					"u": "\u1d38",
					"c": "ᴸ"
				},
				"M": {
					"u": "\u1d39",
					"c": "ᴹ"
				},
				"N": {
					"u": "\u1d3a",
					"c": "ᴺ"
				},
				"O": {
					"u": "\u1d3c",
					"c": "ᴼ"
				},
				"P": {
					"u": "\u1d3e",
					"c": "ᴾ"
				},
				"Q": {
					"u": "\u146b",
					"c": "ᑫ"
				},
				"R": {
					"u": "\u1d3f",
					"c": "ᴿ"
				},
				"S": {
					"u": "\u02e2",
					"c": "ˢ"
				},
				"T": {
					"u": "\u1d40",
					"c": "ᵀ"
				},
				"U": {
					"u": "\u1d41",
					"c": "ᵁ"
				},
				"V": {
					"u": "\u2c7d",
					"c": "ⱽ"
				},
				"W": {
					"u": "\u1d42",
					"c": "ᵂ"
				},
				"X": {
					"u": "\u02e3",
					"c": "ˣ"
				},
				"Y": {
					"u": "\u02b8",
					"c": "ʸ"
				},
				"Z": {
					"u": "\u1dbb",
					"c": "ᶻ"
				},
				"a": {
					"u": "\u1d43",
					"c": "ᵃ"
				},
				"b": {
					"u": "\u1d47",
					"c": "ᵇ"
				},
				"c": {
					"u": "\u1d9c",
					"c": "ᶜ"
				},
				"d": {
					"u": "\u1d48",
					"c": "ᵈ"
				},
				"e": {
					"u": "\u1d49",
					"c": "ᵉ"
				},
				"f": {
					"u": "\u1da0",
					"c": "ᶠ"
				},
				"g": {
					"u": "\u1d4d",
					"c": "ᵍ"
				},
				"h": {
					"u": "\u02b0",
					"c": "ʰ"
				},
				"i": {
					"u": "\u1da6",
					"c": "ᶦ"
				},
				"j": {
					"u": "\u02b2",
					"c": "ʲ"
				},
				"k": {
					"u": "\u1d4f",
					"c": "ᵏ"
				},
				"l": {
					"u": "\u1dab",
					"c": "ᶫ"
				},
				"m": {
					"u": "\u1d50",
					"c": "ᵐ"
				},
				"n": {
					"u": "\u1db0",
					"c": "ᶰ"
				},
				"o": {
					"u": "\u1d52",
					"c": "ᵒ"
				},
				"p": {
					"u": "\u1d56",
					"c": "ᵖ"
				},
				"q": {
					"u": "\u146b",
					"c": "ᑫ"
				},
				"r": {
					"u": "\u02b3",
					"c": "ʳ"
				},
				"s": {
					"u": "\u02e2",
					"c": "ˢ"
				},
				"t": {
					"u": "\u1d57",
					"c": "ᵗ"
				},
				"u": {
					"u": "\u1d58",
					"c": "ᵘ"
				},
				"v": {
					"u": "\u1d5b",
					"c": "ᵛ"
				},
				"w": {
					"u": "\u02b7",
					"c": "ʷ"
				},
				"x": {
					"u": "\u02e3",
					"c": "ˣ"
				},
				"y": {
					"u": "\u02b8",
					"c": "ʸ"
				},
				"z": {
					"u": "\u1dbb",
					"c": "ᶻ"
				},
				"!": {
					"u": "\ufe57",
					"c": "﹗"
				},
				"?": {
					"u": "\ufe56",
					"c": "﹖"
				},
				"*": {
					"u": "\ufe61",
					"c": "﹡"
				},
				".": {
					"u": "\u22c5",
					"c": "⋅"
				},
				"=": {
					"u": "\u207c",
					"c": "⁼"
				},
				"-": {
					"u": "\u207b",
					"c": "⁻"
				},
				"(": {
					"u": "\u207d",
					"c": "⁽"
				},
				")": {
					"u": "\u207e",
					"c": "⁾"
				}
			}
		},
		{
			"name": "Mirror",
			"entries": {
				"3": {
					"u": "\u01b8",
					"c": "Ƹ"
				},
				"B": {
					"u": "\u1660",
					"c": "ᙠ"
				},
				"C": {
					"u": "\u0186",
					"c": "Ɔ"
				},
				"D": {
					"u": "\u15e1",
					"c": "ᗡ"
				},
				"E": {
					"u": "\u018e",
					"c": "Ǝ"
				},
				"F": {
					"u": "\u15b7",
					"c": "ᖷ"
				},
				"G": {
					"u": "\u13ae",
					"c": "Ꭾ"
				},
				"J": {
					"u": "\u10b1",
					"c": "Ⴑ"
				},
				"K": {
					"u": "\u1434",
					"c": "ᐴ"
				},
				"L": {
					"u": "\u2143",
					"c": "⅃"
				},
				"N": {
					"u": "\u0418",
					"c": "И"
				},
				"P": {
					"u": "\ua7fc",
					"c": "ꟼ"
				},
				"Q": {
					"u": "\u1ecc",
					"c": "Ọ"
				},
				"R": {
					"u": "\u042f",
					"c": "Я"
				},
				"S": {
					"u": "\u01a7",
					"c": "Ƨ"
				},
				"Z": {
					"u": "\u01b8",
					"c": "Ƹ"
				},
				"a": {
					"u": "\u0252",
					"c": "ɒ"
				},
				"b": {
					"u": "\u0064",
					"c": "d"
				},
				"c": {
					"u": "\u0254",
					"c": "ɔ"
				},
				"d": {
					"u": "\u0062",
					"c": "b"
				},
				"e": {
					"u": "\u0258",
					"c": "ɘ"
				},
				"f": {
					"u": "\u0287",
					"c": "ʇ"
				},
				"g": {
					"u": "\u01eb",
					"c": "ǫ"
				},
				"h": {
					"u": "\u029c",
					"c": "ʜ"
				},
				"j": {
					"u": "\u10b1",
					"c": "Ⴑ"
				},
				"k": {
					"u": "\u029e",
					"c": "ʞ"
				},
				"p": {
					"u": "\u0071",
					"c": "q"
				},
				"q": {
					"u": "\u0070",
					"c": "p"
				},
				"r": {
					"u": "\u027f",
					"c": "ɿ"
				},
				"s": {
					"u": "\u01a8",
					"c": "ƨ"
				},
				"t": {
					"u": "\u019a",
					"c": "ƚ"
				},
				"?": {
					"u": "\u241a",
					"c": "␚"
				}
			}
		},
		{
			"name": "Invert",
			"entries": {
				"A": {
					"u": "\u15c4",
					"c": "ᗄ"
				},
				"B": {
					"u": "\u15f7",
					"c": "ᗷ"
				},
				"C": {
					"u": "\u2282",
					"c": "⊂"
				},
				"F": {
					"u": "\u15b6",
					"c": "ᖶ"
				},
				"G": {
					"u": "\u2141",
					"c": "⅁"
				},
				"J": {
					"u": "\u1603",
					"c": "ᘃ"
				},
				"K": {
					"u": "\u029e",
					"c": "ʞ"
				},
				"L": {
					"u": "\u2142",
					"c": "⅂"
				},
				"M": {
					"u": "\u028d",
					"c": "ʍ"
				},
				"P": {
					"u": "\u0062",
					"c": "b"
				},
				"Q": {
					"u": "\u2d5a",
					"c": "ⵚ"
				},
				"R": {
					"u": "\u1589",
					"c": "ᖉ"
				},
				"S": {
					"u": "\u1d24",
					"c": "ᴤ"
				},
				"T": {
					"u": "\u22a5",
					"c": "⊥"
				},
				"U": {
					"u": "\u2229",
					"c": "∩"
				},
				"V": {
					"u": "\u22c0",
					"c": "⋀"
				},
				"W": {
					"u": "\u004d",
					"c": "M"
				},
				"Y": {
					"u": "\u2144",
					"c": "⅄"
				},
				"a": {
					"u": "\u0250",
					"c": "ɐ"
				},
				"b": {
					"u": "\u0070",
					"c": "p"
				},
				"c": {
					"u": "\u217d",
					"c": "ⅽ"
				},
				"d": {
					"u": "\u0071",
					"c": "q"
				},
				"e": {
					"u": "\u04e9",
					"c": "ө"
				},
				"f": {
					"u": "\u0288",
					"c": "ʈ"
				},
				"g": {
					"u": "\u0253",
					"c": "ɓ"
				},
				"h": {
					"u": "\u00b5",
					"c": "µ"
				},
				"i": {
					"u": "\u0021",
					"c": "!"
				},
				"j": {
					"u": "\u027e",
					"c": "ɾ"
				},
				"k": {
					"u": "\u029e",
					"c": "ʞ"
				},
				"l": {
					"u": "\ua781",
					"c": "ꞁ"
				},
				"m": {
					"u": "\u0077",
					"c": "w"
				},
				"n": {
					"u": "\u0075",
					"c": "u"
				},
				"p": {
					"u": "\u0062",
					"c": "b"
				},
				"q": {
					"u": "\u0064",
					"c": "d"
				},
				"r": {
					"u": "\u0281",
					"c": "ʁ"
				},
				"s": {
					"u": "\u01a8",
					"c": "ƨ"
				},
				"t": {
					"u": "\u0287",
					"c": "ʇ"
				},
				"u": {
					"u": "\u2229",
					"c": "∩"
				},
				"v": {
					"u": "\u0668",
					"c": "٨"
				},
				"w": {
					"u": "\u028d",
					"c": "ʍ"
				},
				"y": {
					"u": "\u028e",
					"c": "ʎ"
				},
				"!": {
					"u": "\u00a1",
					"c": "¡"
				},
				"?": {
					"u": "\u00bf",
					"c": "¿"
				}
			}
		},
		{
			"name": "Reverse",
			"entries": {
				"3": {
					"u": "\u01b8",
					"c": "Ƹ"
				},
				"B": {
					"u": "\u1660",
					"c": "ᙠ"
				},
				"C": {
					"u": "\u0186",
					"c": "Ɔ"
				},
				"D": {
					"u": "\u15e1",
					"c": "ᗡ"
				},
				"E": {
					"u": "\u018e",
					"c": "Ǝ"
				},
				"F": {
					"u": "\u15b7",
					"c": "ᖷ"
				},
				"G": {
					"u": "\u13ae",
					"c": "Ꭾ"
				},
				"J": {
					"u": "\u10b1",
					"c": "Ⴑ"
				},
				"K": {
					"u": "\u1434",
					"c": "ᐴ"
				},
				"L": {
					"u": "\u2143",
					"c": "⅃"
				},
				"N": {
					"u": "\u0418",
					"c": "И"
				},
				"P": {
					"u": "\ua7fc",
					"c": "ꟼ"
				},
				"Q": {
					"u": "\u1ecc",
					"c": "Ọ"
				},
				"R": {
					"u": "\u042f",
					"c": "Я"
				},
				"S": {
					"u": "\u01a7",
					"c": "Ƨ"
				},
				"Z": {
					"u": "\u01b8",
					"c": "Ƹ"
				},
				"a": {
					"u": "\u0252",
					"c": "ɒ"
				},
				"c": {
					"u": "\u0254",
					"c": "ɔ"
				},
				"e": {
					"u": "\u0258",
					"c": "ɘ"
				},
				"f": {
					"u": "\u0287",
					"c": "ʇ"
				},
				"g": {
					"u": "\u01eb",
					"c": "ǫ"
				},
				"h": {
					"u": "\u029c",
					"c": "ʜ"
				},
				"j": {
					"u": "\u10b1",
					"c": "Ⴑ"
				},
				"k": {
					"u": "\u029e",
					"c": "ʞ"
				},
				"r": {
					"u": "\u027f",
					"c": "ɿ"
				},
				"s": {
					"u": "\u01a8",
					"c": "ƨ"
				},
				"t": {
					"u": "\u019a",
					"c": "ƚ"
				},
				"?": {
					"u": "\u241a",
					"c": "␚"
				}
			}
		},
		{
			"name": "Upside Down",
			"entries": {
				"A": {
					"u": "\u0250",
					"c": "ɐ"
				},
				"B": {
					"u": "q",
					"c": "q"
				},
				"C": {
					"u": "\u0254",
					"c": "ɔ"
				},
				"D": {
					"u": "p",
					"c": "p"
				},
				"E": {
					"u": "\u01DD",
					"c": "ǝ"
				},
				"F": {
					"u": "\u025F",
					"c": "ɟ"
				},
				"G": {
					"u": "\u0183",
					"c": "ƃ"
				},
				"H": {
					"u": "\u0265",
					"c": "ɥ"
				},
				"I": {
					"u": "\u0131",
					"c": "ı"
				},
				"J": {
					"u": "\u027E",
					"c": "ɾ"
				},
				"K": {
					"u": "\u029E",
					"c": "ʞ"
				},
				"L": {
					"u": "\u05DF",
					"c": "ן"
				},
				"M": {
					"u": "\u026F",
					"c": "ɯ"
				},
				"N": {
					"u": "u",
					"c": "u"
				},
				"O": {
					"u": "o",
					"c": "o"
				},
				"P": {
					"u": "d",
					"c": "d"
				},
				"Q": {
					"u": "b",
					"c": "b"
				},
				"R": {
					"u": "\u0279",
					"c": "ɹ"
				},
				"S": {
					"u": "s",
					"c": "s"
				},
				"T": {
					"u": "\u0287",
					"c": "ʇ"
				},
				"U": {
					"u": "n",
					"c": "n"
				},
				"V": {
					"u": "\uD800\uDF21",
					"c": "𐌡"
				},
				"W": {
					"u": "\u028D",
					"c": "ʍ"
				},
				"X": {
					"u": "x",
					"c": "x"
				},
				"Y": {
					"u": "\u028E",
					"c": "ʎ"
				},
				"Z": {
					"u": "z",
					"c": "z"
				},
				"a": {
					"u": "\u0250",
					"c": "ɐ"
				},
				"b": {
					"u": "q",
					"c": "q"
				},
				"c": {
					"u": "\u0254",
					"c": "ɔ"
				},
				"d": {
					"u": "p",
					"c": "p"
				},
				"e": {
					"u": "\u01DD",
					"c": "ǝ"
				},
				"f": {
					"u": "\u025F",
					"c": "ɟ"
				},
				"g": {
					"u": "\u0183",
					"c": "ƃ"
				},
				"h": {
					"u": "\u0265",
					"c": "ɥ"
				},
				"i": {
					"u": "\u0131",
					"c": "ı"
				},
				"j": {
					"u": "\u027E",
					"c": "ɾ"
				},
				"k": {
					"u": "\u029E",
					"c": "ʞ"
				},
				"l": {
					"u": "\u05DF",
					"c": "ן"
				},
				"m": {
					"u": "\u026F",
					"c": "ɯ"
				},
				"n": {
					"u": "u",
					"c": "u"
				},
				"p": {
					"u": "d",
					"c": "d"
				},
				"q": {
					"u": "b",
					"c": "b"
				},
				"r": {
					"u": "\u0279",
					"c": "ɹ"
				},
				"t": {
					"u": "\u0287",
					"c": "ʇ"
				},
				"u": {
					"u": "n",
					"c": "n"
				},
				"v": {
					"u": "\u028C",
					"c": "ʌ"
				},
				"w": {
					"u": "\u028D",
					"c": "ʍ"
				},
				"y": {
					"u": "\u028E",
					"c": "ʎ"
				}
			}
		},
		{
			"name": "Flip",
			"lowercase": true,
			"reverse": true,
			"entries": {
				"a": {
					"u": "\u0250",
					"c": "ɐ"
				},
				"b": {
					"u": "q",
					"c": "q"
				},
				"c": {
					"u": "\u0254",
					"c": "ɔ"
				},
				"d": {
					"u": "p",
					"c": "p"
				},
				"e": {
					"u": "\u01DD",
					"c": "ǝ"
				},
				"f": {
					"u": "\u025F",
					"c": "ɟ"
				},
				"g": {
					"u": "\u0183",
					"c": "ƃ"
				},
				"h": {
					"u": "\u0265",
					"c": "ɥ"
				},
				"i": {
					"u": "\u0131",
					"c": "ı"
				},
				"j": {
					"u": "\u027E",
					"c": "ɾ"
				},
				"k": {
					"u": "\u029E",
					"c": "ʞ"
				},
				"m": {
					"u": "\u026F",
					"c": "ɯ"
				},
				"n": {
					"u": "u",
					"c": "u"
				},
				"r": {
					"u": "\u0279",
					"c": "ɹ"
				},
				"t": {
					"u": "\u0287",
					"c": "ʇ"
				},
				"v": {
					"u": "\u028C",
					"c": "ʌ"
				},
				"w": {
					"u": "\u028D",
					"c": "ʍ"
				},
				"y": {
					"u": "\u028E",
					"c": "ʎ"
				},
				".": {
					"u": "\u02D9",
					"c": "˙"
				},
				"[": {
					"u": "]",
					"c": "]"
				},
				"(": {
					"u": ")",
					"c": ")"
				},
				"{": {
					"u": "}",
					"c": "}"
				},
				"?": {
					"u": "\u00BF",
					"c": "¿"
				},
				"!": {
					"u": "\u00A1",
					"c": "¡"
				},
				"'": {
					"u": ",",
					"c": ","
				},
				"<": {
					"u": ">",
					"c": ">"
				},
				"_": {
					"u": "\u203E",
					"c": "‾"
				},
				";": {
					"u": "\u061B",
					"c": "؛"
				},
				"‿": {
					"u": "\u2040",
					"c": "⁀"
				},
				"⁅": {
					"u": "\u2046",
					"c": "⁆"
				},
				"∴": {
					"u": "\u2235",
					"c": "∵"
				},
				"\r": {
					"u": "\n",
					"c": "\n"
				}
			}
		}
	],
	charcallbacks: [
		{
			"name": "Breezah",
			"callback": function (c, i) {
				return i % 2 ? c : c.toUpperCase();
			}
		},
		{
			"name": "Striked Out",
			"callback": function (c) {
				return c + '\u0336';
			}
		},
		{
			"name": "Zalgo",
			"info": {
				name: "2009 - Tchouky",
				link: "http://www.eeemo.net/"
			},
			"options": {
				"up": true,
				"mid": false,
				"down": true,
				"mode": "normal",
				"modes": ["mini", "normal", "maxi"],
				zalgo_down: [
					{
						"u": "\u0316",
						"c": "̖"
					},
					{
						"u": "\u0317",
						"c": "̗"
					},
					{
						"u": "\u0318",
						"c": "̘"
					},
					{
						"u": "\u0319",
						"c": "̙"
					},
					{
						"u": "\u031C",
						"c": "̜"
					},
					{
						"u": "\u031D",
						"c": "̝"
					},
					{
						"u": "\u031E",
						"c": "̞"
					},
					{
						"u": "\u031F",
						"c": "̟"
					},
					{
						"u": "\u0320",
						"c": "̠"
					},
					{
						"u": "\u0324",
						"c": "̤"
					},
					{
						"u": "\u0325",
						"c": "̥"
					},
					{
						"u": "\u0326",
						"c": "̦"
					},
					{
						"u": "\u0329",
						"c": "̩"
					},
					{
						"u": "\u032A",
						"c": "̪"
					},
					{
						"u": "\u032B",
						"c": "̫"
					},
					{
						"u": "\u032C",
						"c": "̬"
					},
					{
						"u": "\u032D",
						"c": "̭"
					},
					{
						"u": "\u032E",
						"c": "̮"
					},
					{
						"u": "\u032F",
						"c": "̯"
					},
					{
						"u": "\u0330",
						"c": "̰"
					},
					{
						"u": "\u0331",
						"c": "̱"
					},
					{
						"u": "\u0332",
						"c": "̲"
					},
					{
						"u": "\u0333",
						"c": "̳"
					},
					{
						"u": "\u0339",
						"c": "̹"
					},
					{
						"u": "\u033A",
						"c": "̺"
					},
					{
						"u": "\u033B",
						"c": "̻"
					},
					{
						"u": "\u033C",
						"c": "̼"
					},
					{
						"u": "\u0345",
						"c": "ͅ"
					},
					{
						"u": "\u0347",
						"c": "͇"
					},
					{
						"u": "\u0348",
						"c": "͈"
					},
					{
						"u": "\u0349",
						"c": "͉"
					},
					{
						"u": "\u034D",
						"c": "͍"
					},
					{
						"u": "\u034E",
						"c": "͎"
					},
					{
						"u": "\u0353",
						"c": "͓"
					},
					{
						"u": "\u0354",
						"c": "͔"
					},
					{
						"u": "\u0355",
						"c": "͕"
					},
					{
						"u": "\u0356",
						"c": "͖"
					},
					{
						"u": "\u0359",
						"c": "͙"
					},
					{
						"u": "\u035A",
						"c": "͚"
					},
					{
						"u": "\u0323",
						"c": "̣"
					}
				],
				zalgo_up: [
					{
						"u": "\u030D",
						"c": "̍"
					},
					{
						"u": "\u030E",
						"c": "̎"
					},
					{
						"u": "\u0304",
						"c": "̄"
					},
					{
						"u": "\u0305",
						"c": "̅"
					},
					{
						"u": "\u033F",
						"c": "̿"
					},
					{
						"u": "\u0311",
						"c": "̑"
					},
					{
						"u": "\u0306",
						"c": "̆"
					},
					{
						"u": "\u0310",
						"c": "̐"
					},
					{
						"u": "\u0352",
						"c": "͒"
					},
					{
						"u": "\u0357",
						"c": "͗"
					},
					{
						"u": "\u0351",
						"c": "͑"
					},
					{
						"u": "\u0307",
						"c": "̇"
					},
					{
						"u": "\u0308",
						"c": "̈"
					},
					{
						"u": "\u030A",
						"c": "̊"
					},
					{
						"u": "\u0342",
						"c": "͂"
					},
					{
						"u": "\u0343",
						"c": "̓"
					},
					{
						"u": "\u0344",
						"c": "̈́"
					},
					{
						"u": "\u034A",
						"c": "͊"
					},
					{
						"u": "\u034B",
						"c": "͋"
					},
					{
						"u": "\u034C",
						"c": "͌"
					},
					{
						"u": "\u0303",
						"c": "̃"
					},
					{
						"u": "\u0302",
						"c": "̂"
					},
					{
						"u": "\u030C",
						"c": "̌"
					},
					{
						"u": "\u0350",
						"c": "͐"
					},
					{
						"u": "\u0300",
						"c": "̀"
					},
					{
						"u": "\u0301",
						"c": "́"
					},
					{
						"u": "\u030B",
						"c": "̋"
					},
					{
						"u": "\u030F",
						"c": "̏"
					},
					{
						"u": "\u0312",
						"c": "̒"
					},
					{
						"u": "\u0313",
						"c": "̓"
					},
					{
						"u": "\u0314",
						"c": "̔"
					},
					{
						"u": "\u033D",
						"c": "̽"
					},
					{
						"u": "\u0309",
						"c": "̉"
					},
					{
						"u": "\u0363",
						"c": "ͣ"
					},
					{
						"u": "\u0364",
						"c": "ͤ"
					},
					{
						"u": "\u0365",
						"c": "ͥ"
					},
					{
						"u": "\u0366",
						"c": "ͦ"
					},
					{
						"u": "\u0367",
						"c": "ͧ"
					},
					{
						"u": "\u0368",
						"c": "ͨ"
					},
					{
						"u": "\u0369",
						"c": "ͩ"
					},
					{
						"u": "\u036A",
						"c": "ͪ"
					},
					{
						"u": "\u036B",
						"c": "ͫ"
					},
					{
						"u": "\u036C",
						"c": "ͬ"
					},
					{
						"u": "\u036D",
						"c": "ͭ"
					},
					{
						"u": "\u036E",
						"c": "ͮ"
					},
					{
						"u": "\u036F",
						"c": "ͯ"
					},
					{
						"u": "\u033E",
						"c": "̾"
					},
					{
						"u": "\u035B",
						"c": "͛"
					},
					{
						"u": "\u0346",
						"c": "͆"
					},
					{
						"u": "\u031A",
						"c": "̚"
					}
				],
				zalgo_mid: [
					{
						"u": "\u0315",
						"c": "̕"
					},
					{
						"u": "\u031B",
						"c": "̛"
					},
					{
						"u": "\u0340",
						"c": "̀"
					},
					{
						"u": "\u0341",
						"c": "́"
					},
					{
						"u": "\u0358",
						"c": "͘"
					},
					{
						"u": "\u0321",
						"c": "̡"
					},
					{
						"u": "\u0322",
						"c": "̢"
					},
					{
						"u": "\u0327",
						"c": "̧"
					},
					{
						"u": "\u0328",
						"c": "̨"
					},
					{
						"u": "\u0334",
						"c": "̴"
					},
					{
						"u": "\u0335",
						"c": "̵"
					},
					{
						"u": "\u0336",
						"c": "̶"
					},
					{
						"u": "\u034F",
						"c": "͏"
					},
					{
						"u": "\u035C",
						"c": "͜"
					},
					{
						"u": "\u035D",
						"c": "͝"
					},
					{
						"u": "\u035E",
						"c": "͞"
					},
					{
						"u": "\u035F",
						"c": "͟"
					},
					{
						"u": "\u0360",
						"c": "͠"
					},
					{
						"u": "\u0362",
						"c": "͢"
					},
					{
						"u": "\u0338",
						"c": "̸"
					},
					{
						"u": "\u0337",
						"c": "̷"
					},
					{
						"u": "\u0361",
						"c": "͡"
					},
					{
						"u": "\u0489",
						"c": "҉"
					}
				]
			},
			"callback": function (c, i, options) {

				//gets an int between 0 and max
				function rand(max) {
					return Math.floor(Math.random() * max);
				}

				//gets a random char from a zalgo char table
				function rand_zalgo(array) {
					var ind = Math.floor(Math.random() * array.length);
					return array[ind].u;
				}

				var num_up;
				var num_mid;
				var num_down;

				//add the normal character
				var newtxt = c;

				//options
				if (options.mode == "mini") {
					num_up = rand(8);
					num_mid = rand(2);
					num_down = rand(8);
				} else if (options.mode == "normal") {
					num_up = rand(16) / 2 + 1;
					num_mid = rand(6) / 2;
					num_down = rand(16) / 2 + 1;
				} else {//maxi
					num_up = rand(64) / 4 + 3;
					num_mid = rand(16) / 4 + 1;
					num_down = rand(64) / 4 + 3;
				}

				if (options.up)
					for (var u = 0; u < num_up; u++)
						newtxt += rand_zalgo(options.zalgo_up);
				if (options.mid)
					for (var m = 0; m < num_mid; m++)
						newtxt += rand_zalgo(options.zalgo_mid);
				if (options.down)
					for (var d = 0; d < num_down; d++)
						newtxt += rand_zalgo(options.zalgo_down);
				return newtxt;
			}
		}
	],
	txtcallbacks: [
		{
			"name": "Ligature",
			"info": {
				"name": "Lea Verou",
				"link": "http://lea.verou.me/demos/ligatweet/"
			},
			"options": {
				"goal": 140,
				"insensitive": false,
				"entries": [
					{
						"regex": "viii",
						"u": "\u2177",
						"c": "ⅷ"
					},
					{
						"regex": "\\.\\.\\.",
						"u": "\u0085",
						"c": ""
					},
					{
						"regex": "\\b1/3\\b",
						"u": "\u2153",
						"c": "⅓"
					},
					{
						"regex": "\\b2/3\\b",
						"u": "\u2154",
						"c": "⅔"
					},
					{
						"regex": "\\b1/8\\b",
						"u": "\u215B",
						"c": "⅛"
					},
					{
						"regex": "\\b3/8\\b",
						"u": "\u215C",
						"c": "⅜"
					},
					{
						"regex": "\\b5/8\\b",
						"u": "\u215D",
						"c": "⅝"
					},
					{
						"regex": "\\b7/8\\b",
						"u": "\u215E",
						"c": "⅞"
					},
					{
						"regex": "iii",
						"u": "\u2172",
						"c": "ⅲ"
					},
					{
						"regex": "vii",
						"u": "\u2176",
						"c": "ⅶ"
					},
					{
						"regex": "xii",
						"u": "\u217B",
						"c": "ⅻ"
					},
					{
						"regex": "<=>",
						"u": "\u21D4",
						"c": "⇔"
					},
					{
						"regex": "10\\.",
						"u": "\u2491",
						"c": "⒑"
					},
					{
						"regex": "11\\.",
						"u": "\u2492",
						"c": "⒒"
					},
					{
						"regex": "12\\.",
						"u": "\u2493",
						"c": "⒓"
					},
					{
						"regex": "13\\.",
						"u": "\u2494",
						"c": "⒔"
					},
					{
						"regex": "14\\.",
						"u": "\u2495",
						"c": "⒕"
					},
					{
						"regex": "15\\.",
						"u": "\u2496",
						"c": "⒖"
					},
					{
						"regex": "16\\.",
						"u": "\u2497",
						"c": "⒗"
					},
					{
						"regex": "17\\.",
						"u": "\u2498",
						"c": "⒘"
					},
					{
						"regex": "18\\.",
						"u": "\u2499",
						"c": "⒙"
					},
					{
						"regex": "19\\.",
						"u": "\u249A",
						"c": "⒚"
					},
					{
						"regex": "20\\.",
						"u": "\u249B",
						"c": "⒛"
					},
					{
						"regex": "ffi",
						"u": "\uFB03",
						"c": "ﬃ"
					},
					{
						"regex": "ffl",
						"u": "\uFB04",
						"c": "ﬄ"
					},
					{
						"regex": "--",
						"u": "\u0097",
						"c": ""
					},
					{
						"regex": "AE",
						"u": "\u00C6",
						"c": "Æ"
					},
					{
						"regex": "ae",
						"u": "\u00E6",
						"c": "æ"
					},
					{
						"regex": "oe",
						"u": "\u009C",
						"c": ""
					},
					{
						"regex": "OE",
						"u": "\u0152",
						"c": "Œ"
					},
					{
						"regex": "IJ",
						"u": "\u0132",
						"c": "Ĳ"
					},
					{
						"regex": "ij",
						"u": "\u0133",
						"c": "ĳ"
					},
					{
						"regex": "L'",
						"u": "\u013D",
						"c": "Ľ"
					},
					{
						"regex": "I'",
						"u": "\u013E",
						"c": "ľ"
					},
					{
						"regex": "LJ",
						"u": "\u01C7",
						"c": "Ǉ"
					},
					{
						"regex": "Lj",
						"u": "\u01C8",
						"c": "ǈ"
					},
					{
						"regex": "lj",
						"u": "\u01C9",
						"c": "ǉ"
					},
					{
						"regex": "NJ",
						"u": "\u01CA",
						"c": "Ǌ"
					},
					{
						"regex": "Nj",
						"u": "\u01CB",
						"c": "ǋ"
					},
					{
						"regex": "nj",
						"u": "\u01CC",
						"c": "ǌ"
					},
					{
						"regex": "DZ",
						"u": "\u01F1",
						"c": "Ǳ"
					},
					{
						"regex": "Dz",
						"u": "\u01F2",
						"c": "ǲ"
					},
					{
						"regex": "dz",
						"u": "\u01F3",
						"c": "ǳ"
					},
					{
						"regex": "ts",
						"u": "\u02A6",
						"c": "ʦ"
					},
					{
						"regex": "tf",
						"u": "\u02A7",
						"c": "ʧ"
					},
					{
						"regex": "tc",
						"u": "\u02A8",
						"c": "ʨ"
					},
					{
						"regex": "fn",
						"u": "\u02A9",
						"c": "ʩ"
					},
					{
						"regex": "ls",
						"u": "\u02AA",
						"c": "ʪ"
					},
					{
						"regex": "lz",
						"u": "\u02AB",
						"c": "ʫ"
					},
					{
						"regex": "Hb",
						"u": "\u040A",
						"c": "Њ"
					},
					{
						"regex": "bl",
						"u": "\u042B",
						"c": "Ы"
					},
					{
						"regex": "IO",
						"u": "\u042E",
						"c": "Ю"
					},
					{
						"regex": "io",
						"u": "\u044E",
						"c": "ю"
					},
					{
						"regex": "Oy",
						"u": "\u0478",
						"c": "Ѹ"
					},
					{
						"regex": "oy",
						"u": "\u0479",
						"c": "ѹ"
					},
					{
						"regex": "ue",
						"u": "\u1D6B",
						"c": "ᵫ"
					},
					{
						"regex": "ll",
						"u": "\u2016",
						"c": "‖"
					},
					{
						"regex": "!!",
						"u": "\u203C",
						"c": "‼"
					},
					{
						"regex": "\\?\\?",
						"u": "\u2047",
						"c": "⁇"
					},
					{
						"regex": "\\?!",
						"u": "\u2048",
						"c": "⁈"
					},
					{
						"regex": "!\\?",
						"u": "\u2049",
						"c": "⁉"
					},
					{
						"regex": "Rs",
						"u": "\u20A8",
						"c": "₨"
					},
					{
						"regex": "tb",
						"u": "\u2114",
						"c": "℔"
					},
					{
						"regex": "ii",
						"u": "\u2171",
						"c": "ⅱ"
					},
					{
						"regex": "iv",
						"u": "\u2173",
						"c": "ⅳ"
					},
					{
						"regex": "vi",
						"u": "\u2175",
						"c": "ⅵ"
					},
					{
						"regex": "ix",
						"u": "\u2178",
						"c": "ⅸ"
					},
					{
						"regex": "xi",
						"u": "\u217A",
						"c": "ⅺ"
					},
					{
						"regex": "<-",
						"u": "\u2190",
						"c": "←"
					},
					{
						"regex": "->",
						"u": "\u2192",
						"c": "→"
					},
					{
						"regex": "=>",
						"u": "\u21D2",
						"c": "⇒"
					},
					{
						"regex": "<<",
						"u": "\u226A",
						"c": "≪"
					},
					{
						"regex": ">>",
						"u": "\u226B",
						"c": "≫"
					},
					{
						"regex": "1\\.",
						"u": "\u2488",
						"c": "⒈"
					},
					{
						"regex": "2\\.",
						"u": "\u2489",
						"c": "⒉"
					},
					{
						"regex": "3\\.",
						"u": "\u248A",
						"c": "⒊"
					},
					{
						"regex": "4\\.",
						"u": "\u248B",
						"c": "⒋"
					},
					{
						"regex": "5\\.",
						"u": "\u248C",
						"c": "⒌"
					},
					{
						"regex": "6\\.",
						"u": "\u248D",
						"c": "⒍"
					},
					{
						"regex": "7\\.",
						"u": "\u248E",
						"c": "⒎"
					},
					{
						"regex": "8\\.",
						"u": "\u248F",
						"c": "⒏"
					},
					{
						"regex": "9\\.",
						"u": "\u2490",
						"c": "⒐"
					},
					{
						"regex": "ff",
						"u": "\uFB00",
						"c": "ﬀ"
					},
					{
						"regex": "fi",
						"u": "\uFB01",
						"c": "ﬁ"
					},
					{
						"regex": "fl",
						"u": "\uFB02",
						"c": "ﬂ"
					},
					{
						"regex": "ft",
						"u": "\uFB05",
						"c": "ﬅ"
					},
					{
						"regex": "st",
						"u": "\uFB06",
						"c": "ﬆ"
					},
					{
						"regex": " !",
						"u": "\uFE15",
						"c": "︕"
					},
					{
						"regex": " \\?",
						"u": "\uFE16",
						"c": "︖"
					},
					{
						"regex": "\\b1/5\\b",
						"u": "\u2155",
						"c": "⅕"
					},
					{
						"regex": "\\b2/5\\b",
						"u": "\u2156",
						"c": "⅖"
					},
					{
						"regex": "\\b3/5\\b",
						"u": "\u2157",
						"c": "⅗"
					},
					{
						"regex": "\\b4/5\\b",
						"u": "\u2158",
						"c": "⅘"
					},
					{
						"regex": "\\b1/6\\b",
						"u": "\u2159",
						"c": "⅙"
					},
					{
						"regex": "\\b5/6\\b",
						"u": "\u215A",
						"c": "⅚"
					},
					{
						"regex": "VIII",
						"u": "\u2166",
						"c": "Ⅶ"
					},
					{
						"regex": "kcal",
						"u": "\u3389",
						"c": "㎉"
					},
					{
						"regex": "a\\.m\\.",
						"u": "\u33C2",
						"c": "㏂"
					},
					{
						"regex": "K\\.K\\.",
						"u": "\u33CD",
						"c": "㏍"
					},
					{
						"regex": "p\\.m\\.",
						"u": "\u33D8",
						"c": "㏘"
					},
					{
						"regex": "\\b1/4\\b",
						"u": "\u00BC",
						"c": "¼"
					},
					{
						"regex": "\\b1/2\\b",
						"u": "\u00BD",
						"c": "½"
					},
					{
						"regex": "\\b3/4\\b",
						"u": "\u00BE",
						"c": "¾"
					},
					{
						"regex": "Pts",
						"u": "\u20A7",
						"c": "₧"
					},
					{
						"regex": "TEL",
						"u": "\u2121",
						"c": "℡"
					},
					{
						"regex": "\\b1/3\\b",
						"u": "\u2153",
						"c": "⅓"
					},
					{
						"regex": "\\b2/3\\b",
						"u": "\u2154",
						"c": "⅔"
					},
					{
						"regex": "\\b1/5\\b",
						"u": "\u2155",
						"c": "⅕"
					},
					{
						"regex": "\\b2/5\\b",
						"u": "\u2156",
						"c": "⅖"
					},
					{
						"regex": "\\b3/5\\b",
						"u": "\u2157",
						"c": "⅗"
					},
					{
						"regex": "\\b4/5\\b",
						"u": "\u2158",
						"c": "⅘"
					},
					{
						"regex": "\\b1/6\\b",
						"u": "\u2159",
						"c": "⅙"
					},
					{
						"regex": "\\b5/6\\b",
						"u": "\u215A",
						"c": "⅚"
					},
					{
						"regex": "\\b1/8\\b",
						"u": "\u215B",
						"c": "⅛"
					},
					{
						"regex": "\\b3/8\\b",
						"u": "\u215C",
						"c": "⅜"
					},
					{
						"regex": "\\b5/8\\b",
						"u": "\u215D",
						"c": "⅝"
					},
					{
						"regex": "\\b7/8\\b",
						"u": "\u215E",
						"c": "⅞"
					},
					{
						"regex": "III",
						"u": "\u2162",
						"c": "Ⅲ"
					},
					{
						"regex": "VII",
						"u": "\u2166",
						"c": "Ⅶ"
					},
					{
						"regex": "XII",
						"u": "\u216B",
						"c": "Ⅻ"
					},
					{
						"regex": "hPa",
						"u": "\u3371",
						"c": "㍱"
					},
					{
						"regex": "bar",
						"u": "\u3374",
						"c": "㍴"
					},
					{
						"regex": "cal",
						"u": "\u3388",
						"c": "㎈"
					},
					{
						"regex": "kHz",
						"u": "\u3391",
						"c": "㎑"
					},
					{
						"regex": "MHz",
						"u": "\u3392",
						"c": "㎒"
					},
					{
						"regex": "GHz",
						"u": "\u3393",
						"c": "㎓"
					},
					{
						"regex": "THz",
						"u": "\u3394",
						"c": "㎔"
					},
					{
						"regex": "kPa",
						"u": "\u33AA",
						"c": "㎪"
					},
					{
						"regex": "MPa",
						"u": "\u33AB",
						"c": "㎫"
					},
					{
						"regex": "GPa",
						"u": "\u33AC",
						"c": "㎬"
					},
					{
						"regex": "rad",
						"u": "\u33AD",
						"c": "㎭"
					},
					{
						"regex": "Co\\.",
						"u": "\u33C7",
						"c": "㏇"
					},
					{
						"regex": "log",
						"u": "\u33D2",
						"c": "㏒"
					},
					{
						"regex": "mil",
						"u": "\u33D5",
						"c": "㏕"
					},
					{
						"regex": "mol",
						"u": "\u33D6",
						"c": "㏖"
					},
					{
						"regex": "PPM",
						"u": "\u33D9",
						"c": "㏙"
					},
					{
						"regex": "hu",
						"u": "\u0195",
						"c": "ƕ"
					},
					{
						"regex": "Hu",
						"u": "\u01F6",
						"c": "Ƕ"
					},
					{
						"regex": "d3",
						"u": "\u02A4",
						"c": "ʤ"
					},
					{
						"regex": "IE",
						"u": "\u0464",
						"c": "Ѥ"
					},
					{
						"regex": "ie",
						"u": "\u0465",
						"c": "ѥ"
					},
					{
						"regex": "du",
						"u": "\u0502",
						"c": "Ԃ"
					},
					{
						"regex": "un",
						"u": "\u057F",
						"c": "տ"
					},
					{
						"regex": "oc",
						"u": "\u1142",
						"c": "ᅂ"
					},
					{
						"regex": "oi",
						"u": "\u13BA",
						"c": "Ꮊ"
					},
					{
						"regex": "oo",
						"u": "\u13C7",
						"c": "Ꮗ"
					},
					{
						"regex": "II",
						"u": "\u2161",
						"c": "Ⅱ"
					},
					{
						"regex": "IV",
						"u": "\u2163",
						"c": "Ⅳ"
					},
					{
						"regex": "VI",
						"u": "\u2165",
						"c": "Ⅵ"
					},
					{
						"regex": "IX",
						"u": "\u2168",
						"c": "Ⅸ"
					},
					{
						"regex": "XI",
						"u": "\u216A",
						"c": "Ⅺ"
					},
					{
						"regex": "CD",
						"u": "\u2180",
						"c": "ↀ"
					},
					{
						"regex": "XX",
						"u": "\u3037",
						"c": "〷"
					},
					{
						"regex": "da",
						"u": "\u3372",
						"c": "㍲"
					},
					{
						"regex": "AU",
						"u": "\u3373",
						"c": "㍳"
					},
					{
						"regex": "oV",
						"u": "\u3375",
						"c": "㍵"
					},
					{
						"regex": "pc",
						"u": "\u3376",
						"c": "㍶"
					},
					{
						"regex": "nA",
						"u": "\u3381",
						"c": "㎁"
					},
					{
						"regex": "mA",
						"u": "\u3383",
						"c": "㎃"
					},
					{
						"regex": "kA",
						"u": "\u3384",
						"c": "㎄"
					},
					{
						"regex": "KB",
						"u": "\u3385",
						"c": "㎅"
					},
					{
						"regex": "MB",
						"u": "\u3386",
						"c": "㎆"
					},
					{
						"regex": "GB",
						"u": "\u3387",
						"c": "㎇"
					},
					{
						"regex": "pF",
						"u": "\u338A",
						"c": "㎊"
					},
					{
						"regex": "nF",
						"u": "\u338B",
						"c": "㎋"
					},
					{
						"regex": "mg",
						"u": "\u338E",
						"c": "㎎"
					},
					{
						"regex": "kg",
						"u": "\u338F",
						"c": "㎏"
					},
					{
						"regex": "Hz",
						"u": "\u3390",
						"c": "㎐"
					},
					{
						"regex": "ml",
						"u": "\u3396",
						"c": "㎖"
					},
					{
						"regex": "kl",
						"u": "\u3398",
						"c": "㎘"
					},
					{
						"regex": "fm",
						"u": "\u3399",
						"c": "㎙"
					},
					{
						"regex": "nm",
						"u": "\u339A",
						"c": "㎚"
					},
					{
						"regex": "mm",
						"u": "\u339C",
						"c": "㎜"
					},
					{
						"regex": "cm",
						"u": "\u339D",
						"c": "㎝"
					},
					{
						"regex": "km",
						"u": "\u339E",
						"c": "㎞"
					},
					{
						"regex": "Pa",
						"u": "\u33A9",
						"c": "㎩"
					},
					{
						"regex": "ps",
						"u": "\u33B0",
						"c": "㎰"
					},
					{
						"regex": "ns",
						"u": "\u33B1",
						"c": "㎱"
					},
					{
						"regex": "ms",
						"u": "\u33B3",
						"c": "㎳"
					},
					{
						"regex": "pV",
						"u": "\u33B4",
						"c": "㎴"
					},
					{
						"regex": "nV",
						"u": "\u33B5",
						"c": "㎵"
					},
					{
						"regex": "mV",
						"u": "\u33B7",
						"c": "㎷"
					},
					{
						"regex": "kV",
						"u": "\u33B8",
						"c": "㎸"
					},
					{
						"regex": "MV",
						"u": "\u33B9",
						"c": "㎹"
					},
					{
						"regex": "pW",
						"u": "\u33BA",
						"c": "㎺"
					},
					{
						"regex": "nW",
						"u": "\u33BB",
						"c": "㎻"
					},
					{
						"regex": "mW",
						"u": "\u33BD",
						"c": "㎽"
					},
					{
						"regex": "kW",
						"u": "\u33BE",
						"c": "㎾"
					},
					{
						"regex": "MW",
						"u": "\u33BF",
						"c": "㎿"
					},
					{
						"regex": "Bq",
						"u": "\u33C3",
						"c": "㏃"
					},
					{
						"regex": "cc",
						"u": "\u33C4",
						"c": "㏄"
					},
					{
						"regex": "cd",
						"u": "\u33C5",
						"c": "㏅"
					},
					{
						"regex": "dB",
						"u": "\u33C8",
						"c": "㏈"
					},
					{
						"regex": "Gy",
						"u": "\u33C9",
						"c": "㏉"
					},
					{
						"regex": "ha",
						"u": "\u33CA",
						"c": "㏊"
					},
					{
						"regex": "HP",
						"u": "\u33CB",
						"c": "㏋"
					},
					{
						"regex": "in",
						"u": "\u33CC",
						"c": "㏌"
					},
					{
						"regex": "KM",
						"u": "\u33CE",
						"c": "㏎"
					},
					{
						"regex": "kt",
						"u": "\u33CF",
						"c": "㏏"
					},
					{
						"regex": "lm",
						"u": "\u33D0",
						"c": "㏐"
					},
					{
						"regex": "ln",
						"u": "\u33D1",
						"c": "㏑"
					},
					{
						"regex": "lx",
						"u": "\u33D3",
						"c": "㏓"
					},
					{
						"regex": "mb",
						"u": "\u33D4",
						"c": "㏔"
					},
					{
						"regex": "pH",
						"u": "\u33D7",
						"c": "㏗"
					},
					{
						"regex": "PR",
						"u": "\u33DA",
						"c": "㏚"
					},
					{
						"regex": "sr",
						"u": "\u33DB",
						"c": "㏛"
					},
					{
						"regex": "Sv",
						"u": "\u33DC",
						"c": "㏜"
					},
					{
						"regex": "Wb",
						"u": "\u33DD",
						"c": "㏝"
					}
				]
			},
			"callback": function (txt, options) {
				var regFlag = "g" + (options.insensitive ? "i" : "");
				for (var i = 0; i < options.entries.length; i++) {
					var e = options.entries[i];
					txt = txt.replace(new RegExp(e.regex, regFlag), e.u);
					if (txt.length <= options.goal)
						return txt;
				}
				return txt;
			}
		}
	],
	maps: [
		{
			"name": "Motlify",
			"lowercase": true,
			"info": {
				name: "motlify",
				link: "http://motlify.com/"
			},
			"entries": {
				"0": [
					{
						"u": "\u041E",
						"c": "О"
					},
					{
						"u": "\u263A",
						"c": "☺"
					},
					{
						"u": "\u2686",
						"c": "⚆"
					},
					{
						"u": "\u24C4",
						"c": "Ⓞ"
					}
				],
				"1": [
					{
						"u": "\u1E37",
						"c": "ḷ"
					}
				],
				"2": [
					{
						"u": "\u01BB",
						"c": "ƻ"
					}
				],
				"3": [
					{
						"u": "\u01B8",
						"c": "Ƹ"
					},
					{
						"u": "\u01EE",
						"c": "Ǯ"
					},
					{
						"u": "\u2125",
						"c": "℥"
					}
				],
				"4": [
					{
						"u": "\u0427",
						"c": "Ч"
					}
				],
				"5": [
					{
						"u": "\u01BC",
						"c": "Ƽ"
					},
					{
						"u": "S",
						"c": "S"
					}
				],
				"6": [
					{
						"u": "\u0411",
						"c": "Б"
					},
					{
						"u": "\u266D",
						"c": "♭"
					}
				],
				"7": [
					{
						"u": "\u0413",
						"c": "Г"
					},
					{
						"u": "7",
						"c": "7"
					}
				],
				"8": [
					{
						"u": "8",
						"c": "8"
					},
					{
						"u": "\u03B8",
						"c": "θ"
					}
				],
				"a": [
					{
						"u": "\u0414",
						"c": "Д"
					},
					{
						"u": "\u0466",
						"c": "Ѧ"
					},
					{
						"u": "\u00C5",
						"c": "Å"
					},
					{
						"u": "\u24B6",
						"c": "Ⓐ"
					},
					{
						"u": "\u039B",
						"c": "Λ"
					}
				],
				"b": [
					{
						"u": "\u0411",
						"c": "Б"
					},
					{
						"u": "\u042A",
						"c": "Ъ"
					},
					{
						"u": "\u266D",
						"c": "♭"
					},
					{
						"u": "\u24B7",
						"c": "Ⓑ"
					},
					{
						"u": "\u03B2",
						"c": "β"
					}
				],
				"c": [
					{
						"u": "\u2103",
						"c": "℃"
					},
					{
						"u": "\u263E",
						"c": "☾"
					},
					{
						"u": "\u00C7",
						"c": "Ç"
					},
					{
						"u": "\u0186",
						"c": "Ɔ"
					},
					{
						"u": "\u2102",
						"c": "ℂ"
					},
					{
						"u": "\u24B8",
						"c": "Ⓒ"
					}
				],
				"d": [
					{
						"u": "\u2136",
						"c": "ℶ"
					},
					{
						"u": "\u00D0",
						"c": "Ð"
					},
					{
						"u": "\u24B9",
						"c": "Ⓓ"
					},
					{
						"u": "\u0394",
						"c": "Δ"
					}
				],
				"e": [
					{
						"u": "\u0404",
						"c": "Є"
					},
					{
						"u": "\u212E",
						"c": "℮"
					},
					{
						"u": "\u2107",
						"c": "ℇ"
					},
					{
						"u": "\u018E",
						"c": "Ǝ"
					},
					{
						"u": "\u24BA",
						"c": "Ⓔ"
					},
					{
						"u": "\u039E",
						"c": "Ξ"
					},
					{
						"u": "\u03BE",
						"c": "ξ"
					}
				],
				"f": [
					{
						"u": "\u2109",
						"c": "℉"
					},
					{
						"u": "\u2132",
						"c": "Ⅎ"
					},
					{
						"u": "\u0191",
						"c": "Ƒ"
					},
					{
						"u": "\u0192",
						"c": "ƒ"
					},
					{
						"u": "\u24BB",
						"c": "Ⓕ"
					}
				],
				"g": [
					{
						"u": "\u0480",
						"c": "Ҁ"
					},
					{
						"u": "\u2141",
						"c": "⅁"
					},
					{
						"u": "\u24BC",
						"c": "Ⓖ"
					}
				],
				"h": [
					{
						"u": "\u210B",
						"c": "ℋ"
					},
					{
						"u": "\u210D",
						"c": "ℍ"
					},
					{
						"u": "\u2441",
						"c": "⑁"
					},
					{
						"u": "\u2644",
						"c": "♄"
					},
					{
						"u": "\u24BD",
						"c": "Ⓗ"
					}
				],
				"i": [
					{
						"u": "\u2695",
						"c": "⚕"
					},
					{
						"u": "\u2160",
						"c": "Ⅰ"
					},
					{
						"u": "\u24BE",
						"c": "Ⓘ"
					}
				],
				"j": [
					{
						"u": "\u2110",
						"c": "ℐ"
					},
					{
						"u": "\u0134",
						"c": "Ĵ"
					},
					{
						"u": "\u24BF",
						"c": "Ⓙ"
					}
				],
				"k": [
					{
						"u": "\u0136",
						"c": "Ķ"
					},
					{
						"u": "\u0138",
						"c": "ĸ"
					},
					{
						"u": "\u0198",
						"c": "Ƙ"
					},
					{
						"u": "\u1E34",
						"c": "Ḵ"
					},
					{
						"u": "\u1E30",
						"c": "Ḱ"
					},
					{
						"u": "\u24C0",
						"c": "Ⓚ"
					}
				],
				"l": [
					{
						"u": "\u2112",
						"c": "ℒ"
					},
					{
						"u": "\u2113\u0139",
						"c": "ℓĹ"
					},
					{
						"u": "\u0139",
						"c": "Ĺ"
					},
					{
						"u": "\u24C1",
						"c": "Ⓛ"
					}
				],
				"m": [
					{
						"u": "\u028D",
						"c": "ʍ"
					},
					{
						"u": "\u1E42",
						"c": "Ṃ"
					},
					{
						"u": "\u1E3E",
						"c": "Ḿ"
					},
					{
						"u": "\u2133",
						"c": "ℳ"
					},
					{
						"u": "\u24C2",
						"c": "Ⓜ"
					}
				],
				"n": [
					{
						"u": "\u0418",
						"c": "И"
					},
					{
						"u": "\u210F",
						"c": "ℏ"
					},
					{
						"u": "\u2115",
						"c": "ℕ"
					},
					{
						"u": "\u00D1",
						"c": "Ñ"
					},
					{
						"u": "\u014B",
						"c": "ŋ"
					},
					{
						"u": "\u019D",
						"c": "Ɲ"
					},
					{
						"u": "\u24C3",
						"c": "Ⓝ"
					},
					{
						"u": "\u040D",
						"c": "Ѝ"
					}
				],
				"o": [
					{
						"u": "\u041E",
						"c": "О"
					},
					{
						"u": "\u0424",
						"c": "Ф"
					},
					{
						"u": "\u00D6",
						"c": "Ö"
					},
					{
						"u": "\u263A",
						"c": "☺"
					},
					{
						"u": "\u2686",
						"c": "⚆"
					},
					{
						"u": "\u24C4",
						"c": "Ⓞ"
					},
					{
						"u": "\u03B8",
						"c": "θ"
					}
				],
				"p": [
					{
						"u": "\u2119",
						"c": "ℙ"
					},
					{
						"u": "\u2647",
						"c": "♇"
					},
					{
						"u": "\u24C5",
						"c": "Ⓟ"
					},
					{
						"u": "\u03F7",
						"c": "Ϸ"
					}
				],
				"q": [
					{
						"u": "\u211A",
						"c": "ℚ"
					},
					{
						"u": "\u213A",
						"c": "℺"
					},
					{
						"u": "\u24C6",
						"c": "Ⓠ"
					}
				],
				"r": [
					{
						"u": "\u211D",
						"c": "ℝ"
					},
					{
						"u": "\u211E",
						"c": "℞"
					},
					{
						"u": "\u0154",
						"c": "Ŕ"
					},
					{
						"u": "\u24C7",
						"c": "Ⓡ"
					},
					{
						"u": "\u042F",
						"c": "Я"
					}
				],
				"s": [
					{
						"u": "5",
						"c": "5"
					},
					{
						"u": "\u2621",
						"c": "☡"
					},
					{
						"u": "\u26A1",
						"c": "⚡"
					},
					{
						"u": "\u01A7",
						"c": "Ƨ"
					},
					{
						"u": "\u24C8",
						"c": "Ⓢ"
					}
				],
				"t": [
					{
						"u": "\u0413",
						"c": "Г"
					},
					{
						"u": "\u2670",
						"c": "♰"
					},
					{
						"u": "\u2670",
						"c": "♰"
					},
					{
						"u": "\u0166",
						"c": "Ŧ"
					},
					{
						"u": "\u1E6E",
						"c": "Ṯ"
					},
					{
						"u": "\u24C9",
						"c": "Ⓣ"
					}
				],
				"u": [
					{
						"u": "\u0426",
						"c": "Ц"
					},
					{
						"u": "\u2127",
						"c": "℧"
					},
					{
						"u": "\u24CA",
						"c": "Ⓤ"
					},
					{
						"u": "\u03BC",
						"c": "μ"
					}
				],
				"v": [
					{
						"u": "\u0474",
						"c": "Ѵ"
					},
					{
						"u": "\u2123",
						"c": "℣"
					},
					{
						"u": "\u24CB",
						"c": "Ⓥ"
					}
				],
				"w": [
					{
						"u": "\u0460",
						"c": "Ѡ"
					},
					{
						"u": "\u0428",
						"c": "Ш"
					},
					{
						"u": "\u24CC",
						"c": "Ⓦ"
					}
				],
				"x": [
					{
						"u": "\u0416",
						"c": "Ж"
					},
					{
						"u": "\u0425",
						"c": "Х"
					},
					{
						"u": "\u2613",
						"c": "☓"
					},
					{
						"u": "\u2692",
						"c": "⚒"
					},
					{
						"u": "\u2135",
						"c": "ℵ"
					},
					{
						"u": "\u24CD",
						"c": "Ⓧ"
					}
				],
				"y": [
					{
						"u": "\u0427",
						"c": "Ч"
					},
					{
						"u": "\u0470",
						"c": "Ѱ"
					},
					{
						"u": "\u2144",
						"c": "⅄"
					},
					{
						"u": "\u2442",
						"c": "⑂"
					},
					{
						"u": "\u24CE",
						"c": "Ⓨ"
					}
				],
				"z": [
					{
						"u": "\u2621",
						"c": "☡"
					},
					{
						"u": "\u01B5",
						"c": "Ƶ"
					},
					{
						"u": "\u0224",
						"c": "Ȥ"
					},
					{
						"u": "\u24CF",
						"c": "Ⓩ"
					}
				]
			}
		},
		{
			"name": "Random",
			"lowercase": true,
			"entries": {
				"a": [
					{
						"u": "\u00E0",
						"c": "à"
					},
					{
						"u": "\u00E1",
						"c": "á"
					},
					{
						"u": "\u00E2",
						"c": "â"
					},
					{
						"u": "\u00E3",
						"c": "ã"
					},
					{
						"u": "\u00E4",
						"c": "ä"
					},
					{
						"u": "\u00E5",
						"c": "å"
					},
					{
						"u": "\uFF41",
						"c": "ａ"
					},
					{
						"u": "\u0251",
						"c": "ɑ"
					}
				],
				"b": [
					{
						"u": "\uFF42",
						"c": "ｂ"
					},
					{
						"u": "\u0183",
						"c": "ƃ"
					},
					{
						"u": "\u0185",
						"c": "ƅ"
					}
				],
				"c": [
					{
						"u": "\uFF43",
						"c": "ｃ"
					}
				],
				"d": [
					{
						"u": "\u13E7",
						"c": "Ꮷ"
					},
					{
						"u": "\uFF44",
						"c": "ｄ"
					},
					{
						"u": "\u0501",
						"c": "ԁ"
					}
				],
				"e": [
					{
						"u": "\u00E8",
						"c": "è"
					},
					{
						"u": "\u00E9",
						"c": "é"
					},
					{
						"u": "\u00EA",
						"c": "ê"
					},
					{
						"u": "\u00EB",
						"c": "ë"
					},
					{
						"u": "\uFF45",
						"c": "ｅ"
					}
				],
				"f": [
					{
						"u": "\uFF46",
						"c": "ｆ"
					}
				],
				"g": [
					{
						"u": "\uFF47",
						"c": "ｇ"
					},
					{
						"u": "\u01E5",
						"c": "ǥ"
					},
					{
						"u": "\u0262",
						"c": "ɢ"
					}
				],
				"h": [
					{
						"u": "\uFF48",
						"c": "ｈ"
					},
					{
						"u": "\u0570",
						"c": "հ"
					},
					{
						"u": "\u0266",
						"c": "ɦ"
					}
				],
				"i": [
					{
						"u": "\u00EC",
						"c": "ì"
					},
					{
						"u": "\u00ED",
						"c": "í"
					},
					{
						"u": "\u00EF",
						"c": "ï"
					},
					{
						"u": "\uFF49",
						"c": "ｉ"
					}
				],
				"j": [
					{
						"u": "\uFF4A",
						"c": "ｊ"
					},
					{
						"u": "\u03F3",
						"c": "ϳ"
					},
					{
						"u": "\u0575",
						"c": "յ"
					}
				],
				"k": [
					{
						"u": "\uFF4B",
						"c": "ｋ"
					},
					{
						"u": "\u0199",
						"c": "ƙ"
					}
				],
				"l": [
					{
						"u": "\uFF4C",
						"c": "ｌ"
					},
					{
						"u": "\u026D",
						"c": "ɭ"
					}
				],
				"m": [
					{
						"u": "\uFF4D",
						"c": "ｍ"
					},
					{
						"u": "\u03FB",
						"c": "ϻ"
					}
				],
				"n": [
					{
						"u": "\uFF4E",
						"c": "ｎ"
					},
					{
						"u": "\u043B",
						"c": "л"
					},
					{
						"u": "\u0509",
						"c": "ԉ"
					}
				],
				"o": [
					{
						"u": "\u00F2",
						"c": "ò"
					},
					{
						"u": "\uFF4F",
						"c": "ｏ"
					},
					{
						"u": "\u07C0",
						"c": "߀"
					}
				],
				"p": [
					{
						"u": "\uFF50",
						"c": "ｐ"
					},
					{
						"u": "\u03C1",
						"c": "ρ"
					}
				],
				"q": [
					{
						"u": "\uFF51",
						"c": "ｑ"
					},
					{
						"u": "\u024B",
						"c": "ɋ"
					}
				],
				"r": [
					{
						"u": "\uFF52",
						"c": "ｒ"
					}
				],
				"s": [
					{
						"u": "\uFF53",
						"c": "ｓ"
					},
					{
						"u": "\u0455",
						"c": "ѕ"
					}
				],
				"t": [
					{
						"u": "\uFF54",
						"c": "ｔ"
					}
				],
				"u": [
					{
						"u": "\u00F9",
						"c": "ù"
					},
					{
						"u": "\u00FA",
						"c": "ú"
					},
					{
						"u": "\u00FB",
						"c": "û"
					},
					{
						"u": "\u00FC",
						"c": "ü"
					},
					{
						"u": "\uFF55",
						"c": "ｕ"
					}
				],
				"v": [
					{
						"u": "\uFF56",
						"c": "ｖ"
					},
					{
						"u": "\u0475",
						"c": "ѵ"
					}
				],
				"w": [
					{
						"u": "\uFF57",
						"c": "ｗ"
					},
					{
						"u": "\u026F",
						"c": "ɯ"
					},
					{
						"u": "\u0270",
						"c": "ɰ"
					}
				],
				"x": [
					{
						"u": "\uFF58",
						"c": "ｘ"
					},
					{
						"u": "\u0445",
						"c": "х"
					},
					{
						"u": "\u0425",
						"c": "Х"
					},
					{
						"u": "\u04FD",
						"c": "ӽ"
					}
				],
				"y": [
					{
						"u": "\uFF59",
						"c": "ｙ"
					},
					{
						"u": "\u03D2",
						"c": "ϒ"
					}
				],
				"z": [
					{
						"u": "\uFF5A",
						"c": "ｚ"
					},
					{
						"u": "\u0225",
						"c": "ȥ"
					},
					{
						"u": "\u01B6",
						"c": "ƶ"
					}
				]
			}
		}
	],
	offsets: [
		{"name": "Fullwide", "offset": 65248},
		{"name": "Monospace", "offset": 120367},
		{"name": "Double Struck", "offset": 120055},
		{"name": "Courier", "offset": 120367}
	],
	offsetsgroup: [
		{"name": "Fraktur", "default": 120003, "bold": 120107},
		{"name": "Math", "default": 0, "bold": 119743, "italic": 119795, "bolditalic": 119847},
		{"name": "Serif", "default": 119899, "bold": 119951},
		{"name": "Sans Serif", "default": 120159, "bold": 120211, "italic": 120263, "bolditalic": 120315}
	]
};

