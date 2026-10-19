import pathlib
d = pathlib.Path(__file__).parent; src = d / "src"
out = (src / "head.html").read_text() + "<style>\n" + (src / "style.css").read_text() + "</style>\n" + (src / "markup.html").read_text() + "<script>\n" + (src / "app.js").read_text() + "</script>\n"
(d / "sde-gestion.html").write_text(out)
print(d / "sde-gestion.html", len(out.encode()), "octets")
