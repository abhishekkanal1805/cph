import { Extension } from "./extension";

/**
 * Language translation from base language of resource to another language.
 * Context of Use: Use on Element ID string, Element ID code or Element ID markdown
 */
class TranslationExtension extends Extension {
  lang: string;
  content: string;
  extension?: TranslationExtension[];
}

export { TranslationExtension };
