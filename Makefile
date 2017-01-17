SRC=jquery-pullList.js
REL=$(SRC:.js=.min.js)

all: README.md $(REL)

JSMIN=tool/jsmin

clean:
	rm -rf README.md $(REL)

README.md: $(SRC) tool/gen-readme.pl
	perl tool/gen-readme.pl $< > $@

$(REL): $(SRC)
	sh -c "$(JSMIN)" < $< > $@

