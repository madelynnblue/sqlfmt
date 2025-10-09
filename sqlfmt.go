package sqlfmt

import (
	"regexp"
	"strings"
	"unicode"

	"github.com/cockroachdb/cockroachdb-parser/pkg/sql/parser"
	"github.com/cockroachdb/cockroachdb-parser/pkg/sql/sem/tree"
	"github.com/cockroachdb/cockroachdb-parser/pkg/util/json"
	"github.com/cockroachdb/cockroachdb-parser/pkg/util/pretty"
)

var (
	ignoreComments = regexp.MustCompile(`^--.*\s*`)
)

func FmtSQL(cfg tree.PrettyCfg, stmts []string) (string, error) {
	var prettied strings.Builder
	for _, stmt := range stmts {
		for len(stmt) > 0 {
			stmt = strings.TrimSpace(stmt)
			hasContent := false
			// Trim comments, preserving whitespace after them.
			for {
				found := ignoreComments.FindString(stmt)
				if found == "" {
					break
				}
				// Remove trailing whitespace but keep up to 2 newlines.
				prettied.WriteString(strings.TrimRightFunc(found, unicode.IsSpace))
				newlines := strings.Count(found, "\n")
				if newlines > 2 {
					newlines = 2
				}
				prettied.WriteString(strings.Repeat("\n", newlines))
				stmt = stmt[len(found):]
				hasContent = true
			}
			// Split by semicolons
			next := stmt
			if pos, _ := parser.SplitFirstStatement(stmt); pos > 0 {
				next = stmt[:pos]
				stmt = stmt[pos:]
			} else {
				stmt = ""
			}
			// This should only return 0 or 1 responses.
			allParsed, err := parser.Parse(next)
			if err != nil {
				return "", err
			}
			for _, parsed := range allParsed {
				pretty, err := cfg.Pretty(parsed.AST)
				if err != nil {
					return "", err
				}
				prettied.WriteString(pretty)
				prettied.WriteString(";\n")
				hasContent = true
			}
			if hasContent {
				prettied.WriteString("\n")
			}
		}
	}

	return strings.TrimRightFunc(prettied.String(), unicode.IsSpace), nil
}

func FmtJSON(s string) (pretty.Doc, error) {
	j, err := json.ParseJSON(s)
	if err != nil {
		return nil, err
	}
	return fmtJSONNode(j), nil
}

func fmtJSONNode(j json.JSON) pretty.Doc {
	// Figure out what type this is.
	if it, _ := j.ObjectIter(); it != nil {
		// Object.
		elems := make([]pretty.Doc, 0, j.Len())
		for it.Next() {
			elems = append(elems, pretty.NestUnder(
				pretty.Concat(
					pretty.Text(json.FromString(it.Key()).String()),
					pretty.Text(`:`),
				),
				fmtJSONNode(it.Value()),
			))
		}
		return prettyBracket("{", elems, "}")
	} else if n := j.Len(); n > 0 {
		// Non-empty array.
		elems := make([]pretty.Doc, n)
		for i := 0; i < n; i++ {
			elem, err := j.FetchValIdx(i)
			if err != nil {
				return pretty.Text(j.String())
			}
			elems[i] = fmtJSONNode(elem)
		}
		return prettyBracket("[", elems, "]")
	}
	// Other.
	return pretty.Text(j.String())
}

func prettyBracket(l string, elems []pretty.Doc, r string) pretty.Doc {
	return pretty.BracketDoc(pretty.Text(l), pretty.Join(",", elems...), pretty.Text(r))
}
