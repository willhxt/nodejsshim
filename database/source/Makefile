# extract version number from the package.xml
VER = $(shell awk '/version *=/ { split($$0, ary, "[\"= ]*");	\
                                  for (i in ary) {		\
				    if (ary[i] == "version") {	\
				      print ary[i + 1] ; exit;	\
				    } } }' package.xml)
PKG = $(shell awk '/name *=/ { split($$0, ary, "[\"= ]*");	\
                                  for (i in ary) {		\
				    if (ary[i] == "name") {	\
				      print ary[i + 1] ; exit;	\
				    } } }' package.xml)

EXCLUDE = --exclude Makefile --exclude .\*
TAROPTS = -h

all: FORCE
	cd .. && tar czf ../packages/$(PKG)-$(VER).gz $(TAROPTS) $(EXCLUDE) source

FORCE:
