package main

import (
	"syscall/js"

	"github.com/cockroachdb/cockroachdb-parser/pkg/sql/sem/tree"
	"github.com/cockroachdb/cockroachdb-parser/pkg/util/pretty"
	"github.com/madelynnblue/sqlfmt"
)

func main() {
	js.Global().Set("FmtSQL", FmtSQL())
	select {}
}

func FmtSQL() js.Func {
	jsonFunc := js.FuncOf(func(this js.Value, args []js.Value) any {
		if len(args) != 7 {
			return "Invalid number of arguments passed"
		}
		input := args[0].String()
		cfg := tree.DefaultPrettyCfg()
		cfg.LineWidth = args[1].Int()
		cfg.TabWidth = args[2].Int()
		cfg.UseTabs = args[3].Int() == 0
		cfg.Simplify = args[4].Int() == 1
		cfg.Align = tree.PrettyAlignMode(args[5].Int())
		cfg.JSONFmt = args[6].Int() == 1
		prettySQL, sqlErr := sqlfmt.FmtSQL(cfg, []string{input})
		if sqlErr == nil {
			return prettySQL
		}
		if jsonDoc, jErr := sqlfmt.FmtJSON(input); jErr == nil && jsonDoc != nil {
			prettyJSON, jsonErr := pretty.Pretty(jsonDoc, cfg.LineWidth, cfg.UseTabs, cfg.TabWidth, nil)
			if jsonErr == nil {
				return prettyJSON
			}
		}
		return sqlErr.Error()
	})
	return jsonFunc
}
