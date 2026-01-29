if (!WebAssembly.instantiateStreaming) {
    // polyfill
    WebAssembly.instantiateStreaming = async (resp, importObject) => {
        const source = await (await resp).arrayBuffer();
        return await WebAssembly.instantiate(source, importObject);
    };
}

const go = new Go();
let mod, inst;
WebAssembly.instantiateStreaming(fetch("sqlfmt.wasm"), go.importObject)
    .then((result) => {
        go.run(result.instance);
    })
    .catch((err) => {
        console.error(err);
    });

const textCopy = document.getElementById("text-copy");
const actualWidth = document.getElementById("actual_width");
const actualBytes = document.getElementById("actual_bytes");
const n = document.getElementById("n");
const iw = document.getElementById("indent");
const simplify = document.getElementById("simplify");
const jsonfmt = document.getElementById("jsonfmt");
const align = document.theform.align;
const spaces = document.getElementById("spaces");
const fmt = document.getElementById("fmt");
const sqlEl = document.getElementById("sql");
const share = document.getElementById("share");
const reset = document.getElementById("reset");
const pasteEl = document.getElementById("paste");
document.getElementById("submitButton").style.display = "none";
Object.values(document.getElementsByClassName("jsonly")).forEach(
    (v) => (v.style.display = "inline")
);
let fmtText;
document.getElementById("copy").addEventListener("click", (ev) => {
    copyTextToClipboard(fmtText);
});
function resetVals() {
    localStorage.clear();
    reloadVals();
    range();
}
function clearSQL() {
    sqlEl.value = "";
    range();
}
// https://stackoverflow.com/questions/400212/how-do-i-copy-to-the-clipboard-in-javascript
function copyTextToClipboard(text) {
    const textArea = document.createElement("textarea");
    // Place in top-left corner of screen regardless of scroll position.
    textArea.style.position = "fixed";
    textArea.style.top = 0;
    textArea.style.left = 0;
    // Ensure it has a small width and height. Setting to 1px / 1em
    // doesn't work as this gives a negative w/h on some browsers.
    textArea.style.width = "2em";
    textArea.style.height = "2em";
    // We don't need padding, reducing the size if it does flash render.
    textArea.style.padding = 0;
    // Clean up any borders.
    textArea.style.border = "none";
    textArea.style.outline = "none";
    textArea.style.boxShadow = "none";
    // Avoid flash of white box if rendered for any reason.
    textArea.style.background = "transparent";
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand("copy");
    } catch (err) {
        console.log(err);
    }
    document.body.removeChild(textArea);
}
function range() {
    if (!globalThis.FmtSQL) {
        setTimeout(range, 100);
        return;
    }
    const v = parseInt(n.value);
    document.getElementById("nval").innerText = v;
    const viw = parseInt(iw.value);
    const sql = sqlEl.value;
    const spVal = spaces.checked ? 1 : 0;
    const simplifyVal = simplify.checked ? 1 : 0;
    const jsonfmtVal = jsonfmt.checked ? 1 : 0;
    const alVal = parseInt(align.value);
    localStorage.setItem("sql", sql);
    localStorage.setItem("n", v);
    localStorage.setItem("iw", viw);
    localStorage.setItem("simplify", simplifyVal);
    localStorage.setItem("jsonfmt", jsonfmtVal);
    localStorage.setItem("align", alVal);
    localStorage.setItem("spaces", spVal);
    fmt.style["tab-size"] = viw;
    fmt.style["-moz-tab-size"] = viw;
    share.href =
        "/?n=" +
        v +
        "&indent=" +
        viw +
        "&spaces=" +
        spVal +
        "&simplify=" +
        simplifyVal +
        "&jsonfmt=" +
        jsonfmtVal +
        "&align=" +
        alVal +
        "&sql=" +
        encodeURIComponent(b64EncodeUnicode(sql));
    try {
        fmtText = globalThis.FmtSQL(sql, v, viw, spVal, simplifyVal, alVal, jsonfmtVal);
        actualWidth.innerText = Math.max(
            ...fmtText.split("\n").map((v) => v.length)
        );
        actualBytes.innerText = fmtText.length;
        hLine = "--";
        if (v > 2) {
            hLine = hLine + "-".repeat(v - 2);
        }
        fmt.innerText = hLine + "\n\n" + fmtText;
    } catch (e) {
        fmt.innerText = e;
        actualWidth.innerText = "";
        actualBytes.innerText = "";
    }
}
function b64EncodeUnicode(str) {
    // first we use encodeURIComponent to get percent-encoded UTF-8,
    // then we convert the percent encodings into raw bytes which
    // can be fed into btoa.
    return btoa(
        encodeURIComponent(str).replace(
            /%([0-9A-F]{2})/g,
            function toSolidBytes(match, p1) {
                return String.fromCharCode("0x" + p1);
            }
        )
    );
}
function b64DecodeUnicode(str) {
    // Going backwards: from bytestream, to percent-encoding, to original string.
    return decodeURIComponent(
        atob(str)
            .split("")
            .map(function (c) {
                return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
            })
            .join("")
    );
}
let search;
if (location.search) {
    search = new URLSearchParams(location.search);
}
function reloadVals() {
    // Load initial defaults from storage.
    let sql = localStorage.getItem("sql");
    let nVal = localStorage.getItem("n");
    let iwVal = localStorage.getItem("iw");
    let simplifyVal = localStorage.getItem("simplify") === "0" ? 0 : 1;
    let jsonfmtVal = localStorage.getItem("jsonfmt") === "0" ? 0 : 1;
    let alVal = localStorage.getItem("align");
    let spVal = localStorage.getItem("spaces") === "1" ? 1 : 0;

    // Load predefined defaults, for each value that didn't have a default in storage.
    if (sql === null) {
        sql = `SELECT count(*) count, winner, counter * (60 * 5) as counter FROM (SELECT winner, round(length / (60 * 5)) as counter FROM players WHERE build = $1 AND (hero = $2 OR region = $3)) WHERE data @> '{"data": {"domain": "github.com"}}'::JSON GROUP BY winner, counter;
INSERT INTO players(build, hero, region, winner, length) VALUES ($1, $2, $3, $4, $5);
INSERT INTO players SELECT players_copy ORDER BY length;
UPDATE players SET count = 0 WHERE build = $1 AND (hero = $2 OR region = $3) LIMIT 1;`;
    }
    if (nVal === null) {
        nVal = 60;
    }
    if (nVal === null) {
        nVal = 60;
    }
    if (iwVal === null) {
        iwVal = 4;
    }
    if (simplifyVal === null) {
        simplifyVal = 1;
    }
    if (alVal === null) {
        alVal = 0;
    }
    if (spVal === null) {
        spVal = 0;
    }
    // Override any value from the URL.
    if (search) {
        if (search.has("sql")) {
            sql = b64DecodeUnicode(search.get("sql"));
        }
        if (search.has("n")) {
            nVal = search.get("n");
        }
        if (search.has("indent")) {
            iwVal = search.get("indent");
        }
        if (search.has("align")) {
            alVal = search.get("align");
        }
        if (search.has("simplify")) {
            simplifyVal = search.get("simplify");
        }
        if (search.has("jsonfmt")) {
            jsonfmtVal = search.get("jsonfmt");
        }
        if (search.has("spaces")) {
            spVal = search.get("spaces");
        }
    }
    // Populate the form.
    sqlEl.value = sql;
    n.value = nVal;
    iw.value = iwVal;
    simplify.checked = !!simplifyVal;
    jsonfmt.checked = !!jsonfmtVal;
    align.value = alVal;
    spaces.checked = !!spVal;
}
reloadVals();
pasteEl.checked = localStorage.getItem("paste") === "1";
function autoPaste() {
    const p = pasteEl.checked ? 1 : 0;
    localStorage.setItem("paste", p);
    if (p) {
        navigator.clipboard.readText().then((clipText) => {
            sqlEl.value = clipText;
            range();
        });
    }
}
if (!search || !search.has("sql")) {
    autoPaste();
}
(() => {
    if (location.search) {
        const clearSearch = () => {
            window.history.replaceState(null, "", "/");
            sqlEl.onkeydown = null;
            n.oninput = n.onchange = range;
            reset.onclick = resetVals;
        };
        sqlEl.onkeydown = clearSearch;
        n.oninput = n.onchange = () => {
            clearSearch();
            range();
        };
        reset.onclick = () => {
            clearSearch();
            resetVals();
        };
    }
})();
range();