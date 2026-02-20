import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative glass-card !bg-slate-900/95 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-md flex items-center justify-between p-5 pb-3 border-b border-slate-800/50 z-10">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors" aria-label="閉じる">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="p-5 text-sm text-slate-300 leading-relaxed space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
};

export const TermsModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="利用規約">
    <p className="text-xs text-slate-500">最終更新日: 2026年2月20日</p>
    <p>本利用規約（以下「本規約」）は、株式会社ヒトコト（以下「当社」）が提供するmusicseed（以下「本サービス」）の利用条件を定めるものです。</p>

    <h3 className="text-white font-semibold pt-2">第1条（適用）</h3>
    <p>本規約は、ユーザーと当社との間の本サービスの利用に関わる一切の関係に適用されるものとします。</p>

    <h3 className="text-white font-semibold pt-2">第2条（サービス内容）</h3>
    <p>本サービスは、AI技術を活用して既存楽曲の分析に基づく音楽制作用プロンプトおよびオリジナル歌詞を生成するツールです。生成されたコンテンツは参考目的であり、その正確性・完全性を保証するものではありません。</p>

    <h3 className="text-white font-semibold pt-2">第3条（禁止事項）</h3>
    <ul className="list-disc pl-5 space-y-1">
      <li>法令または公序良俗に違反する行為</li>
      <li>当社のサーバーまたはネットワークに過度な負荷をかける行為</li>
      <li>本サービスの運営を妨害するおそれのある行為</li>
      <li>他のユーザーに迷惑をかける行為</li>
      <li>不正アクセスまたはこれを試みる行為</li>
      <li>本サービスを利用して第三者の著作権その他の権利を侵害する行為</li>
    </ul>

    <h3 className="text-white font-semibold pt-2">第4条（利用制限）</h3>
    <p>本サービスは匿名ユーザーあたり100回の利用制限があります。当社は事前の通知なく利用制限を変更する場合があります。</p>

    <h3 className="text-white font-semibold pt-2">第5条（生成コンテンツ）</h3>
    <p>本サービスで生成されたプロンプトおよび歌詞のコンテンツについて、ユーザーは自己の責任においてご利用ください。生成物の利用に起因するいかなる損害についても、当社は責任を負いません。</p>

    <h3 className="text-white font-semibold pt-2">第6条（免責事項）</h3>
    <p>当社は、本サービスに事実上または法律上の瑕疵がないことを保証するものではありません。本サービスの利用に起因してユーザーに生じた損害について、当社の故意または重大な過失による場合を除き、一切の責任を負いません。</p>

    <h3 className="text-white font-semibold pt-2">第7条（規約の変更）</h3>
    <p>当社は、ユーザーに通知することなく本規約を変更することができるものとします。変更後の利用規約は、本サービス上に表示した時点より効力を生じるものとします。</p>

    <h3 className="text-white font-semibold pt-2">第8条（準拠法・裁判管轄）</h3>
    <p>本規約の解釈にあたっては日本法を準拠法とします。本サービスに関して紛争が生じた場合には、福岡地方裁判所を第一審の専属的合意管轄とします。</p>

    <div className="pt-4 border-t border-slate-800/50 text-xs text-slate-500">
      <p>株式会社ヒトコト</p>
      <p>代表: 小南優作</p>
    </div>
  </Modal>
);

export const PrivacyModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="プライバシーポリシー">
    <p className="text-xs text-slate-500">最終更新日: 2026年2月20日</p>
    <p>株式会社ヒトコト（以下「当社」）は、musicseed（以下「本サービス」）におけるユーザーの個人情報の取扱いについて、以下のとおりプライバシーポリシーを定めます。</p>

    <h3 className="text-white font-semibold pt-2">1. 収集する情報</h3>
    <ul className="list-disc pl-5 space-y-1">
      <li><strong>匿名識別子:</strong> サービスの利用回数を管理するため、ブラウザのローカルストレージにランダムな識別子（UUID）を生成・保存します。これは個人を特定する情報ではありません。</li>
      <li><strong>利用回数:</strong> サービスの利用制限を管理するため、上記識別子と利用回数を記録します。</li>
      <li><strong>検索クエリ:</strong> ユーザーが入力した楽曲名は、AI分析のためにGoogle Gemini APIに送信されます。当社のサーバーに検索クエリを永続的に保存することはありません。</li>
      <li><strong>生成履歴:</strong> 生成されたプロンプト・歌詞は、ユーザーのブラウザのローカルストレージにのみ保存され、当社のサーバーには送信されません。</li>
    </ul>

    <h3 className="text-white font-semibold pt-2">2. 情報の利用目的</h3>
    <ul className="list-disc pl-5 space-y-1">
      <li>本サービスの提供・運営</li>
      <li>利用制限の管理</li>
      <li>サービスの改善・新機能の開発</li>
    </ul>

    <h3 className="text-white font-semibold pt-2">3. 第三者への提供</h3>
    <p>当社は、以下の場合を除き、ユーザーの情報を第三者に提供することはありません。</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>法令に基づく場合</li>
      <li>AI分析のためのGoogle Gemini APIへのクエリ送信（Googleのプライバシーポリシーに準拠）</li>
      <li>利用回数管理のためのSupabaseへのデータ保存（Supabaseのプライバシーポリシーに準拠）</li>
    </ul>

    <h3 className="text-white font-semibold pt-2">4. Cookie等について</h3>
    <p>本サービスはCookieを使用しません。ローカルストレージを利用して匿名識別子および生成履歴を保存します。</p>

    <h3 className="text-white font-semibold pt-2">5. セキュリティ</h3>
    <p>当社は、ユーザーの情報の漏洩、滅失または毀損の防止その他の安全管理のために必要かつ適切な措置を講じます。</p>

    <h3 className="text-white font-semibold pt-2">6. お問い合わせ</h3>
    <p>本ポリシーに関するお問い合わせは、下記までご連絡ください。</p>
    <div className="pt-2 text-xs text-slate-500">
      <p>株式会社ヒトコト</p>
      <p>代表: 小南優作</p>
      <p>Email: <a href="mailto:y.kominami@hitokoto1.co.jp" className="text-purple-400 hover:underline">y.kominami@hitokoto1.co.jp</a></p>
    </div>
  </Modal>
);

export const ContactModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="お問い合わせ">
    <p>本サービスに関するお問い合わせは、下記メールアドレスまでお気軽にご連絡ください。</p>
    <div className="glass-card !p-4 rounded-xl text-center space-y-3 mt-2">
      <p className="text-white font-semibold">株式会社ヒトコト</p>
      <p className="text-slate-400">代表: 小南優作</p>
      <a
        href="mailto:y.kominami@hitokoto1.co.jp"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium text-sm hover:brightness-110 transition-all"
      >
        📧 y.kominami@hitokoto1.co.jp
      </a>
    </div>
  </Modal>
);
