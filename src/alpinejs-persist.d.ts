// Ambient declaration for the untyped @alpinejs/persist plugin. This file has
// no top-level import/export, so `declare module` here is an ambient module
// declaration that *provides* the missing types (rather than an augmentation).
declare module "@alpinejs/persist" {
    import type { Alpine } from "alpinejs";

    const persist: (alpine: Alpine) => void;
    export default persist;
}
