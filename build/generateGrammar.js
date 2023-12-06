// @ts-check

const fs = require("fs");
const path = require("path");
const { languages } = require("./languages");

const targetScopes = ["source.yaml"];

const basicGrammarTemplate = {
    "fileTypes": [],
    "injectionSelector": getBasicGrammarInjectionSelector(),
    "patterns": [],
    "scopeName": "inline.template-tagged-languages",
};

const getBasicGrammarPattern = (language) => {
    const sources = Array.isArray(language.source)
        ? language.source
        : [language.source];
    const identifierPattern = language.identifiers.map(escapeRegExp).join("|");
    return {
        // name: `string.unquoted.block.yaml.tagged.${language.name}`,
        contentName: `meta.embedded.block.${language.name}`,

        // The leading '|1+' was consumed by outer rule
        begin: `(#)[ \t]*(${identifierPattern})\\n`,
        beginCaptures: {
            0: {
                name: "comment.line.number-sign.yaml",
            },
            1: {
                name: "punctuation.definition.comment.yaml",
            },
            2: {
                name: `comment.tag.${language.name}`,
            },
        },
        end: "^(?=\\S)|(?!\\G)",
        patterns: [
            {
                "begin": "(?=^([ ]+)(?! ))",
                "end": "^(?!\\1|\\s*$)",
                "name": "string.unquoted.block.yaml",
                "patterns": [
                    ...sources.map((source) => ({ "include": source })),
                ],
            },
        ],
    };
};

const getBasicGrammar = () => {
    const basicGrammar = basicGrammarTemplate;

    basicGrammar.repository = languages.reduce((repository, language) => {
        repository[getRepositoryName(language)] =
            getBasicGrammarPattern(language);
        return repository;
    }, {});

    const allLanguageIdentifiers = [].concat(
        ...languages.map((x) => x.identifiers)
    );
    const allIdentifiersPattern = allLanguageIdentifiers
        .map(escapeRegExp)
        .join("|");
    basicGrammar.patterns = [
        {
            // Match entire language comment identifier but only consume '/'
            begin: `(?:(\\|))([1-9])?([-+])?[ \t]*`,
            beginCaptures: {
                1: { name: "keyword.control.flow.block-scalar.literal.yaml" },
                2: {
                    name: "constant.numeric.indentation-indicator.yaml",
                },
                3: {
                    name: "storage.modifier.chomping-indicator.yaml",
                },
            },
            end: "^(?=\\S)|(?!\\G)",
            patterns: languages.map((language) => ({
                include: "#" + getRepositoryName(language),
            })),
        },
    ];

    return basicGrammar;
};

function getRepositoryName(language) {
    return "commentTaggedString-" + language.name;
}

function getBasicGrammarInjectionSelector() {
    return targetScopes
        .map((scope) => `L:${scope} -comment -(string - meta.embedded)`)
        .join(", ");
}

function escapeRegExp(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

function writeJson(outFile, json) {
    fs.writeFileSync(outFile, JSON.stringify(json, null, 4));
}

exports.updateGrammars = () => {
    const outDir = path.join(__dirname, "..", "syntaxes");
    writeJson(path.join(outDir, "grammar.json"), getBasicGrammar());
};
