import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Zap } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen text-slate-100 relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-fuchsia-600/15 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-violet-600/15 blur-3xl" />
      </div>
      <div className="relative max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-display font-black">Cha Va'Pote</div>
              <div className="text-[10px] uppercase tracking-widest text-violet-300/70">Politique de confidentialité</div>
            </div>
          </div>
          <Link to="/login" className="text-sm text-slate-400 hover:text-slate-200 flex items-center gap-1" data-testid="btn-back-privacy">
            <ArrowLeft className="w-4 h-4" /> Retour
          </Link>
        </div>

        <div className="rounded-3xl p-6 bg-slate-900/70 border border-violet-500/20 space-y-5 text-sm leading-relaxed">
          <div className="flex items-center gap-2 text-fuchsia-300">
            <Shield className="w-5 h-5" />
            <span className="font-display text-xl font-black text-slate-100">Vos données, votre contrôle</span>
          </div>

          <Section title="1. Responsable du traitement">
            L'éditeur de l'application <strong>VapePOS · Cha Va'Pote</strong> est responsable du traitement des données personnelles collectées via l'application client et le logiciel de caisse. Pour toute demande, contactez la boutique.
          </Section>

          <Section title="2. Données collectées">
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>Prénom, nom, email, téléphone (facultatif), date de naissance (vérification 18+).</li>
              <li>Historique des achats effectués en boutique lorsque votre compte est associé à la vente.</li>
              <li>Solde et mouvements de fidélité.</li>
              <li>Un identifiant QR aléatoire (ne contient <em>aucune</em> donnée personnelle).</li>
            </ul>
          </Section>

          <Section title="3. Base légale et finalités">
            Consentement à la création de compte et exécution du programme de fidélité. Les données servent uniquement à identifier le client en boutique, cumuler des points, afficher l'historique et vérifier la majorité.
          </Section>

          <Section title="4. Réservé aux personnes majeures">
            L'inscription est <strong>strictement réservée aux personnes âgées de 18 ans révolus</strong>. Toute demande de création de compte est bloquée côté serveur si la date de naissance ne satisfait pas cette condition.
          </Section>

          <Section title="5. Durée de conservation">
            Les données sont conservées tant que le compte est actif. À la suppression du compte, les données personnelles sont effacées immédiatement. Les tickets de vente restent conservés pour les obligations comptables et fiscales applicables, mais sont anonymisés (lien client supprimé).
          </Section>

          <Section title="6. Sécurité">
            Les mots de passe sont hachés (bcrypt). Les échanges sont chiffrés (HTTPS). Les jetons QR sont opaques et révocables à tout moment depuis l'écran « Mon QR ».
          </Section>

          <Section title="7. Vos droits">
            Vous pouvez à tout moment accéder à vos données, les rectifier depuis « Mon profil », révoquer votre QR ou supprimer définitivement votre compte. La suppression est disponible dans « Mon profil → Zone dangereuse ».
          </Section>

          <Section title="8. Cookies">
            L'application utilise uniquement des cookies techniques pour maintenir votre session. Aucun cookie publicitaire ou de traçage tiers n'est déposé.
          </Section>

          <Section title="9. Partage">
            Vos données ne sont ni vendues, ni louées, ni transmises à des tiers, à l'exception des prestataires techniques nécessaires à l'exploitation du service (hébergement, sauvegardes).
          </Section>

          <Section title="10. Contact">
            Pour toute question ou pour exercer vos droits : rendez-vous en boutique ou contactez-nous par email.
          </Section>

          <div className="text-[11px] text-slate-500 pt-2 border-t border-violet-500/15">
            Dernière mise à jour : février 2026.
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div className="font-bold text-slate-100 mb-1">{title}</div>
      <div className="text-slate-300">{children}</div>
    </div>
  );
}
