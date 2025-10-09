# python3 -m http.server --directory ../docs

export GOOS=js
export GOARCH=wasm
go build -o sqlfmt.wasm -v
brotli -o ../docs/sqlfmt.wasm.br sqlfmt.wasm
