# -*- coding: utf-8 -*-
"""Lead blocks shared by the French SEO pages: free guide (PDF in exchange for an email)
and the 30-minute video call button. The guide form is handled by initGuide() in script.js;
the request is saved as a "contact" with details.demande = "Guide gratuit"."""

GUIDE_PDF = 'assets/guide/guide-site-web-maroc-amweb.pdf'


def visio_btn(cls='btn btn-ghost magnetic', style=''):
    """Opens the booking dialog (data-book), video call selected by default."""
    st = f' style="{style}"' if style else ''
    return f'<button type="button" class="{cls}" data-book{st}><i class="ph ph-calendar-check" aria-hidden="true"></i> Appel visio de 30 min</button>'


def guide_block(root=''):
    """French only. `root` = path from the page to the site root ('' or '../')."""
    pdf = root + GUIDE_PDF
    return f'''
    <section class="section" id="guide" aria-labelledby="guide-title" style="padding-top:0">
      <div class="wrap">
        <div class="ask guide">
          <div class="ask-copy">
            <span class="eyebrow">Guide gratuit · PDF de 5 pages</span>
            <h2 class="ask-title display" id="guide-title">12 points à vérifier avant de créer votre site.</h2>
            <p class="lead">Les questions à poser avant de signer un devis, les pièges qui coûtent cher plus tard et une check-list à cocher. Laissez votre email : le guide se télécharge tout de suite.</p>
            <ul class="guide-list">
              <li><i class="ph ph-check" aria-hidden="true"></i>Domaine, hébergement, 2e année : ce qu'il faut exiger</li>
              <li><i class="ph ph-check" aria-hidden="true"></i>Mobile, vitesse, Google : les bases à vérifier</li>
              <li><i class="ph ph-check" aria-hidden="true"></i>Paiement, loi 09-08 : les règles au Maroc</li>
            </ul>
          </div>
          <form class="form guide-form" data-pdf="{pdf}" novalidate aria-label="Recevoir le guide gratuit">
            <div class="hp" aria-hidden="true"><label>Website<input type="text" name="website" tabindex="-1" autocomplete="off" /></label></div>
            <div class="field"><label for="gName">Nom</label><input id="gName" name="gname" type="text" autocomplete="name" required /><span class="err">Indiquez votre nom.</span></div>
            <div class="field"><label for="gEmail">Email</label><input id="gEmail" name="gemail" type="email" autocomplete="email" required placeholder="vous@exemple.ma" /><span class="err">Saisissez une adresse email valide.</span></div>
            <div class="field"><label for="gPhone">WhatsApp <span class="opt">(facultatif)</span></label><input id="gPhone" name="gphone" type="tel" autocomplete="tel" placeholder="+212 6XX XXX XXX" /></div>
            <button type="submit" class="btn btn-primary btn-full"><i class="ph ph-arrow-down" aria-hidden="true"></i> Télécharger le guide gratuit</button>
            <a class="btn btn-ghost btn-full guide-dl" href="{pdf}" download hidden><i class="ph ph-arrow-down" aria-hidden="true"></i> Ouvrir le guide (PDF)</a>
            <p class="form-note">Pas de spam : on vous écrit seulement si vous le souhaitez. Vos données restent chez AMweb (loi 09-08), voir la <a href="{root}confidentialite.html">confidentialité</a>.</p>
          </form>
        </div>
      </div>
    </section>'''
