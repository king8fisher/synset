package main_test

import (
	"bufio"
	"fmt"
	"os"
	"testing"

	xmlparser "github.com/tamerh/xml-stream-parser"
)

func TestParsing(t *testing.T) {
	f, err := os.Open("data/english-wordnet-2023.xml")
	if err != nil {
		t.Fatalf("can't open file")
	}
	br := bufio.NewReaderSize(f, 65536)
	parser := xmlparser.NewXMLParser(br, "LexicalResource", "Lexicon")
	count := 0
	for xml := range parser.Stream() {
		_ = xml
		count++
		//fmt.Println(xml.Childs["Lexicon"][0].InnerText)
		// if xml.Name == "book" {
		// 	fmt.Println(xml.Childs["comments"][0].Childs["userComment"][0].Attrs["rating"])
		// 	fmt.Println(xml.Childs["comments"][0].Childs["userComment"][0].InnerText)
		// }
	}
	fmt.Printf("%d", count)
}
