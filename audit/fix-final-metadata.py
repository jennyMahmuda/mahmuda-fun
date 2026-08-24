from pathlib import Path
import re
updates={
'cookies.html':('Cookies Policy | mahmuda.fun','Read the mahmuda.fun cookie policy to understand analytics, preferences, advertising technologies and how visitors can manage cookie choices.'),
'terms.html':('Terms of Use | mahmuda.fun','Review the mahmuda.fun terms of use covering access, acceptable use, mature fiction, accounts, content rights and reader responsibilities.'),
'account/forgot.html':('Forgot Password | mahmuda.fun','Request a secure password reset for your mahmuda.fun reader account and return to your saved stories and account settings.'),
'account/reset.html':('Reset Password | mahmuda.fun','Create a new secure password for your mahmuda.fun reader account using the password-reset link sent to your email address.'),
'account/verify.html':('Verify Account | mahmuda.fun','Verify your mahmuda.fun reader account email to activate account access and continue using member features securely.'),
'top-rated/index.html':('Top Rated Stories | mahmuda.fun','Explore the top-rated adult romance stories and mature fiction on mahmuda.fun, selected for strong reader interest and memorable storytelling.'),
'category/affair-romance/index.html':('Affair & Cheating Romance | mahmuda.fun','Read affair and cheating-wife romance stories on mahmuda.fun, with secret relationships, emotional conflict and mature fictional drama.'),
'category/clean-wholesome/index.html':('Clean & Wholesome Romance | mahmuda.fun','Discover clean and wholesome romance stories on mahmuda.fun, featuring emotional tension, sweet connections and low-heat mature fiction.'),
'category/enemies-to-lovers/index.html':('Enemies to Lovers Romance | mahmuda.fun','Explore enemies-to-lovers romance stories on mahmuda.fun, where rivalry, conflict and unexpected attraction shape every fictional relationship.'),
'category/paranormal-fantasy-romance/index.html':('Paranormal & Fantasy Romance | mahmuda.fun','Explore paranormal and fantasy romance stories on mahmuda.fun, featuring otherworldly connections, supernatural tension and mature fictional desire.'),
}
for fn,(title,desc) in updates.items():
    p=Path(fn); h=p.read_text(encoding='utf-8')
    h=re.sub(r'<title>.*?</title>',f'<title>{title}</title>',h,count=1,flags=re.S)
    if re.search(r'<meta[^>]+name=["\']description["\'][^>]*>',h,re.I):
        h=re.sub(r'<meta([^>]+name=["\']description["\'][^>]+content=["\'])[^"\']*(["\'])',lambda m:m.group(1)+desc+m.group(2),h,count=1,flags=re.I)
    else:
        h=h.replace('</head>',f'<meta name="description" content="{desc}">\n</head>',1)
    p.write_text(h,encoding='utf-8')
root=Path('index.html'); h=root.read_text(encoding='utf-8')
h=h.replace('content="mahmuda.fun brings together adult romance stories, mature fiction, dark romance, billionaire romance, forbidden love, slow-burn romance and immersive serialized storytelling."','content="mahmuda.fun brings together adult romance stories, mature fiction, dark romance, forbidden love and immersive serialized storytelling."',1)
h=h.replace('''<span class="sc-brand-mark">\n          SC\n        </span>''','''<span class="sc-brand-mark">\n          <img src="assets/logo.svg" alt="mahmuda.fun logo" width="42" height="42" decoding="async">\n        </span>''',1)
root.write_text(h,encoding='utf-8')
print({'updated':len(updates)+1,'files':list(updates)+['index.html']})
