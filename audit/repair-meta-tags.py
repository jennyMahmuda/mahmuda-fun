from pathlib import Path
import subprocess,re
updates={
'cookies.html':('Cookies Policy | mahmuda.fun','Read the mahmuda.fun cookie policy to understand analytics, preferences, advertising technologies and how visitors can manage cookie choices.'),
'terms.html':('Terms of Use | mahmuda.fun','Review the mahmuda.fun terms of use covering access, acceptable use, mature fiction, accounts, content rights and reader responsibilities.'),
'top-rated/index.html':('Top Rated Stories | mahmuda.fun','Explore the top-rated adult romance stories and mature fiction on mahmuda.fun, selected for strong reader interest and memorable storytelling.'),
'category/affair-romance/index.html':('Affair & Cheating Romance | mahmuda.fun','Read affair and cheating-wife romance stories on mahmuda.fun, with secret relationships, emotional conflict and mature fictional drama.'),
'category/clean-wholesome/index.html':('Clean & Wholesome Romance | mahmuda.fun','Discover clean and wholesome romance stories on mahmuda.fun, featuring emotional tension, sweet connections and low-heat mature fiction.'),
'category/enemies-to-lovers/index.html':('Enemies to Lovers Romance | mahmuda.fun','Explore enemies-to-lovers romance stories on mahmuda.fun, where rivalry, conflict and unexpected attraction shape every fictional relationship.'),
'category/paranormal-fantasy-romance/index.html':('Paranormal & Fantasy Romance | mahmuda.fun','Explore paranormal and fantasy romance stories on mahmuda.fun, featuring otherworldly connections, supernatural tension and mature fictional desire.'),
}
for fn,(title,desc) in updates.items():
    base=subprocess.check_output(['git','show','41fc0be:'+fn],text=True)
    base=re.sub(r'<title>.*?</title>',f'<title>{title}</title>',base,count=1,flags=re.S)
    def repl(m):
        tag=m.group(0)
        if re.search(r'name=["\']description["\']',tag,re.I): return f'<meta name="description" content="{desc}">'
        return tag
    base=re.sub(r'<meta\b[^>]*>',repl,base,flags=re.I)
    Path(fn).write_text(base,encoding='utf-8')
print({'repaired':len(updates)})
