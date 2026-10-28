// Fichier: src/utils/translationGuard.ts
//
// Protection contre le plantage causé par la traduction automatique du
// navigateur (Google Traduction de Chrome, Edge, extensions...).
//
// Le problème : la traduction remplace les textes de la page par des balises
// <font>. React garde en mémoire les anciens éléments ; quand il veut en
// retirer ou en déplacer un, il ne le retrouve plus et le navigateur lève
// « NotFoundError: Failed to execute 'removeChild' on 'Node' » ou
// « 'insertBefore' on 'Node' ». Résultat : l'écran « La page a rencontré une
// erreur », même en rechargeant (la traduction se remet toute seule).
//
// La parade (connue et très répandue pour React) : si l'élément n'est plus
// chez ce parent, on ne fait rien au lieu de planter. Sans traduction,
// ce cas n'arrive jamais : le comportement normal n'est donc pas modifié.
//
// À importer EN PREMIER dans main.tsx, avant le rendu de React.

let warned = false;

function warnOnce(message: string) {
  if (warned) return;
  warned = true;
  console.warn('[translationGuard] ' + message + ' (traduction automatique du navigateur ?)');
}

if (typeof Node === 'function' && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) {
      warnOnce('removeChild ignoré');
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(this: Node, newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      warnOnce('insertBefore ignoré');
      return newNode;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}

export {};
