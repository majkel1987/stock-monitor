export type PluralMessage = {
  one: string;
  few?: string;
  many?: string;
  other: string;
};

export type MessageValue = string | PluralMessage;

export type DictionaryTree = {
  readonly [key: string]: MessageValue | DictionaryTree;
};

export type TranslateParams = {
  count?: number;
  [key: string]: string | number | undefined;
};

type Join<Prefix extends string, Key extends string> = Prefix extends ""
  ? Key
  : `${Prefix}.${Key}`;

export type TranslationKeyOf<
  T,
  Prefix extends string = "",
> = T extends MessageValue
  ? Prefix
  : {
      [K in keyof T & string]: TranslationKeyOf<
        T[K],
        Prefix extends "" ? K : Join<Prefix, K>
      >;
    }[keyof T & string];
