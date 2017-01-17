SRC=jquery-pullList.js
REL=$(SRC:.js=.min.js)
DOC=$(SRC:.js=.html)

all: README.md $(REL) $(DOC)

refdoc: $(DOC)

clean-refdoc:
	-rm -rf $(DOC)

JSMIN=tool/jsmin

clean:
	-rm -rf README.md $(REL) $(DOC)

README.md: $(SRC) tool/gen-readme.pl
	perl tool/gen-readme.pl $< > $@

$(DOC): $(SRC)
	jdcloud-gendoc $^ > $@

$(REL): $(SRC)
	sh -c "$(JSMIN)" < $< > $@

